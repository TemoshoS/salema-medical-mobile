import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { setAuthExpiredHandler } from "../services/apiClient";

export type AuthUser = {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  signIn: (token: string, refreshToken: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync("salema_token"),
      SecureStore.deleteItemAsync("salema_refresh_token"),
      SecureStore.deleteItemAsync("salema_user"),
    ]);
    setToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback(async (
    newToken: string,
    newRefreshToken: string,
    newUser: AuthUser
  ) => {
    await SecureStore.setItemAsync("salema_token", newToken);
    await SecureStore.setItemAsync("salema_refresh_token", newRefreshToken);
    await SecureStore.setItemAsync("salema_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    // A fresh app launch always starts at Login.
    // Backgrounding or switching apps does not unmount this provider.
    void (async () => {
      await signOut();
      setLoading(false);
    })();

    setAuthExpiredHandler(signOut);
    return () => setAuthExpiredHandler(null);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
