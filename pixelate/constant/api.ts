// constant/api.ts

// Read from Expo public env (optional)
const env = (process.env as any) || {};
const rawBase = env.EXPO_PUBLIC_API_BASE as string | undefined;

// Normalize: remove trailing slash if present
const normalized =
  rawBase && typeof rawBase === "string"
    ? rawBase.trim().replace(/\/$/, "")
    : "";

// Default to localhost:8000 for dev if no env set
export const API_BASE =
  normalized || "http://127.0.0.1:8000";

export function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
