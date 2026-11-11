
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  authenticated?: boolean;
};

type RefreshResponse = {
  success: boolean;
  token?: string;
  refreshToken?: string;
  message?: string;
};

let refreshPromise: Promise<string> | null = null;
let authExpiredHandler: (() => Promise<void>) | null = null;

export function setAuthExpiredHandler(
  handler: (() => Promise<void>) | null
) {
  authExpiredHandler = handler;
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const savedRefreshToken = await SecureStore.getItemAsync(
        "salema_refresh_token"
      );

      if (!savedRefreshToken) {
        await SecureStore.deleteItemAsync("salema_token");
        await SecureStore.deleteItemAsync("salema_user");
        await authExpiredHandler?.();
        throw new Error("Your session has expired. Please log in again.");
      }

      let response: Response;

      try {
        response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refreshToken: savedRefreshToken }),
        });
      } catch {
        throw new Error(
          "Cannot connect to Salema Medical to refresh your session."
        );
      }

      const data = (await response.json().catch(() => ({}))) as RefreshResponse;

      if (!response.ok || !data.token || !data.refreshToken) {
        if (response.status === 401 || response.status === 403) {
          await SecureStore.deleteItemAsync("salema_token");
          await SecureStore.deleteItemAsync("salema_refresh_token");
          await SecureStore.deleteItemAsync("salema_user");
          await authExpiredHandler?.();

          throw new Error("Your session has expired. Please log in again.");
        }

        throw new Error(data.message || "Unable to refresh your session.");
      }

      await SecureStore.setItemAsync("salema_token", data.token);
      await SecureStore.setItemAsync(
        "salema_refresh_token",
        data.refreshToken
      );

      return data.token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const authenticated = options.authenticated !== false;

  async function sendRequest(token: string | null): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (authenticated && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      });
    } catch {
      throw new Error(
        "Cannot connect to Salema Medical. Check your network and API URL."
      );
    }
  }

  let token = authenticated
    ? await SecureStore.getItemAsync("salema_token")
    : null;

  let response = await sendRequest(token);

  const canRefresh =
    authenticated &&
    Boolean(token) &&
    response.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/refresh";

  if (canRefresh) {
    token = await refreshAccessToken();
    response = await sendRequest(token);
  }

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "The request could not be completed.");
  }

  return data;
}


export async function apiUpload<T>(
  path: string,
  formData: FormData,
  authenticated = false
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (authenticated) {
    const token = await SecureStore.getItemAsync("salema_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
   } catch (error) {
    const uploadUrl = `${API_BASE_URL}${path}`;

    console.error("========== SALEMA UPLOAD FAILURE ==========");
    console.error("URL:", uploadUrl);
    console.error("Error name:", (error as any)?.name);
    console.error("Error message:", (error as any)?.message);
    console.error("Error string:", String(error));
    console.error("Error details:", JSON.stringify(error));
    console.error("===========================================");

    throw new Error(
      `Provider upload failed: ${String(error)}`
    );
  }

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "The upload could not be completed.");
  }

  return data;
}
