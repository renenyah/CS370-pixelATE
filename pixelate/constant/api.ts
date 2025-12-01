// pixelate/constant/api.ts
import Constants from "expo-constants";

/**
 * Try to figure out the host that is running the Expo dev server.
 * This lets each person on the team:
 *  - run Metro + FastAPI on their own machine
 *  - and the app will automatically talk to THEIR backend.
 */
function getHostFromExpo(): string | null {
  const anyConst: any = Constants;

  // Try a few known places Expo stores the dev host
  const hostUri: string =
    anyConst?.expoConfig?.hostUri ||
    anyConst?.manifest2?.extra?.expoGo?.debuggerHost ||
    anyConst?.manifest?.debuggerHost ||
    "";

  if (!hostUri) return null;

  // hostUri usually looks like "10.0.0.123:19000"
  const [host] = hostUri.split(":");
  return host || null;
}

const DEV_PORT = 8000;

/**
 * Optional override for prod / shared backend.
 * In an .env file you can do:
 *   EXPO_PUBLIC_API_BASE="https://your-ddns-name:8000"
 *
 * Expo will inject EXPO_PUBLIC_* vars into process.env.
 */
const ENV_BASE = process.env.EXPO_PUBLIC_API_BASE;

/**
 * Fallback for simulators on the same machine.
 */
const LOCALHOST_BASE = `http://127.0.0.1:${DEV_PORT}`;

let API_BASE = LOCALHOST_BASE;

// 1) If EXPO_PUBLIC_API_BASE is set, always use that (e.g. DDNS / prod)
if (ENV_BASE && ENV_BASE.trim().length > 0) {
  API_BASE = ENV_BASE.replace(/\/+$/, ""); // strip trailing slashes
} else {
  // 2) Otherwise, in dev, try to detect the Expo dev host
  const host = getHostFromExpo();
  if (host) {
    API_BASE = `http://${host}:${DEV_PORT}`;
  }
}

if (__DEV__) {
  console.log("API_BASE →", API_BASE);
}

/**
 * Helper to construct full URLs to your backend.
 * Example: buildUrl("/assignments/pdf")
 */
function buildUrl(path: string): string {
  const base = API_BASE.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export { API_BASE, buildUrl };
