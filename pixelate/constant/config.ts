// app/config.ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const REDIRECT_URL =
  process.env.EXPO_PUBLIC_REDIRECT_URL ?? "exp://localhost:8081/";