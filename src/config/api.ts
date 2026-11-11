
const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = (
  configuredUrl || "https://medicalapi.mygsalema.co.za/api"
).replace(/\/+$/, "");
