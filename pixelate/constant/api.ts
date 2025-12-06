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
  normalized || "https://cs370-pixelate.onrender.com";

export function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
