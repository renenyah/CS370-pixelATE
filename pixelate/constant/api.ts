// constant/api.ts

// 🔒 Hard-code the backend base URL for now.
// This guarantees we never accidentally hit the old domain.
export const API_BASE = "https://cs370pixelate.onrender.com";

export function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
