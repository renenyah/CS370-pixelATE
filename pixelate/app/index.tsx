// app/index.tsx
import { Redirect } from "expo-router";

export default function Index() {
  // Whenever the app hits "/", immediately send to login
  return <Redirect href="/login" />;
}
