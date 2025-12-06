/**
 * This layout wraps all routes in the (protected) group and ensures
 * they are only accessible to authenticated, verified users.
 *
 * Anything inside app/(protected)/ (like home, profile, calendar)
 * will only render after auth is loaded and the user is verified.
 */

import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedLayout() {
  const { user, loading } = useAuth(); // ✅ call the hook

  // Still checking session
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#020617",
        }}
      >
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  // Optional: treat only email-confirmed accounts as "verified"
  const emailConfirmedAt =
    (user && (user.email_confirmed_at || user.confirmed_at)) ||
    (user && user.user_metadata && user.user_metadata.email_confirmed_at);

  const isVerified = !!emailConfirmedAt;

  // If no user OR not verified → back to login
  if (!user || !isVerified) {
    return <Redirect href="/login" />;
  }

  // Authenticated + verified → render protected routes
  return <Slot />;
}
