// constant/api.ts

export const API_BASE = "https://cs370pixelate.onrender.com";

export function buildUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}