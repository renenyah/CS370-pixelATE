// app/(protected)/_layout.tsx
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedLayout() {
  const { user, loading } = useAuth();

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

  const emailConfirmedAt =
    (user && (user.email_confirmed_at || user.confirmed_at)) ||
    (user &&
      user.user_metadata &&
      user.user_metadata.email_confirmed_at);

  const isVerified = !!emailConfirmedAt;

  if (!user || !isVerified) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}
