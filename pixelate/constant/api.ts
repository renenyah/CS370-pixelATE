// constant/api.ts

// Read from Expo public env
const rawBase =
  (process.env as any)?.EXPO_PUBLIC_API_BASE as string | undefined;

// Normalize: remove trailing slash if present
const normalized =
  rawBase && typeof rawBase === "string"
    ? rawBase.trim().replace(/\/$/, "")
    : "";

// Default to Render backend if no env set
export const API_BASE =
  normalized || "https://cs370pixelate.onrender.com";

export function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
