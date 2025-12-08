// app/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constant/colors";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");

  const handleLogin = async () => {
    setErrorText("");
    setInfoText("");

    if (!email.trim() || !password) {
      setErrorText("Please enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await signIn(email.trim(), password);

      if (error) {
        console.error("Login error:", error);
        setErrorText(error.message || "Invalid credentials.");
        return;
      }

      // If we get here, sign in worked
      setInfoText("Logged in! Loading your assignments...");
      // Go to protected home
      router.replace("/(protected)/home");
    } catch (e: any) {
      console.error("Unexpected login error:", e);
      setErrorText("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome To Dueable</Text>
        <Text style={styles.subtitle}>
          Log in to see what’s due and stay ahead of your classes.
        </Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@school.edu"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, paddingRight: 40 }]}
              placeholder="Enter your password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#9CA3AF" />
              ) : (
                <Eye size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Error / info messages */}
        {errorText ? (
          <Text style={styles.errorText}>{errorText}</Text>
        ) : null}
        {infoText ? (
          <Text style={styles.infoText}>{infoText}</Text>
        ) : null}

        {/* Login button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleLogin}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#0B1220" />
          ) : (
            <Text style={styles.primaryButtonText}>Log In</Text>
          )}
        </TouchableOpacity>

        {/* Forgot password (optional; currently non-functional link) */}
        <TouchableOpacity
          style={{ marginTop: 10, alignItems: "center" }}
          // later: hook this to resetPassword flow
          onPress={() => {
            setInfoText(
              "Password reset coming soon. For now, sign up again if needed."
            );
          }}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Go to signup */}
        <View style={styles.inlineLinkRow}>
          <Text style={styles.inlineText}>
            Don’t have an account?{" "}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/signup")}
          >
            <Text style={styles.inlineLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617", // same dark background as signup
    paddingHorizontal: 24,
    paddingTop: 80,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0B1220",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F9FAFB",
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 18,
    fontSize: 13,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#020617",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 14,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    height: "100%",
    justifyContent: "center",
  },
  errorText: {
    color: "#FCA5A5",
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  infoText: {
    color: "#6EE7B7",
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.lavender || "#A855F7",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0B1220",
    fontWeight: "700",
    fontSize: 15,
  },
  forgotText: {
    color: "#9CA3AF",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  inlineLinkRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
  },
  inlineText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  inlineLink: {
    color: colors.lavender || "#A855F7",
    fontSize: 13,
    fontWeight: "600",
  },
});
