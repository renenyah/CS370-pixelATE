// app/index.tsx
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  console.log("Index - loading:", loading);
  console.log("Index - user:", user?.email || "No user");

  // Show loading while checking auth state
  if (loading) {
    console.log("Still loading auth state...");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  // If user is authenticated, go to home
  if (user) {
    console.log("User authenticated, redirecting to /home");
    return <Redirect href="/home" />;
  }

  // Otherwise go to login
  console.log("No user found, redirecting to /login");
  return <Redirect href="/login" />;
}