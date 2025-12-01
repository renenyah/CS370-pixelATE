// lib/api.ts
import Constants from "expo-constants";

// You can set this in app.config or app.json under expo.extra.apiBase
const fromExtra =
  (Constants.expoConfig as any)?.extra?.apiBase as string | undefined;

export const API_BASE =
  fromExtra ||
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined) ||
  "http://localhost:8000"; // change to your tunnel/local IP if needed

console.log("API_BASE →", API_BASE);

