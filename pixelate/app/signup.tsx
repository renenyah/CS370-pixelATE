// app/signup.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

const COLORS = {
  bg: "#FDF2FF",
  card: "#FFFFFF",
  primary: "#A2D2FF",
  primaryDark: "#6498C6",
  accent: "#FFC8DD",
  accent2: "#CDB4DB",
  textMain: "#111827",
  textSub: "#6B7280",
  border: "#E5E7EB",
};

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSignup = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setError("Please fill out all fields.");
      return;
    }

    setError("");

    // In the future this is where Supabase signup will go
    Alert.alert(
      "All signed up 🎉",
      "Your account is created. Tap below to go back to the login screen.",
      [
        {
          text: "Return to login",
          onPress: () => router.replace("/login"),
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>PIXELATE</Text>
          <Text style={styles.title}>Create your account ✨</Text>
          <Text style={styles.subtitle}>
            Sign up so we can keep all your syllabi and assignments organized.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                style={styles.input}
                placeholderTextColor={COLORS.textSub}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                style={styles.input}
                placeholderTextColor={COLORS.textSub}
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>School email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor={COLORS.textSub}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={COLORS.textSub}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={onSignup}>
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.footerLink}> Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
    color: COLORS.accent2,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textMain,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSub,
    maxWidth: "90%",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMain,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: "#F9FAFB",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 16,
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    color: COLORS.textSub,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  errorText: {
    color: "#DC2626",
    marginTop: 6,
    fontSize: 12,
  },
});
