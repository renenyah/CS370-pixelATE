// app/signup.tsx
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
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constant/colors";

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");

  const handleSignup = async () => {
    setErrorText("");
    setInfoText("");

    if (!name.trim() || !email.trim() || !password) {
      setErrorText("Please fill in name, email, and password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorText("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await signUp(email.trim(), password, name.trim());

      if (error) {
        console.error("Sign up error:", error);
        setErrorText(
          error.message || "Something went wrong. Please try again."
        );
      } else {
        setInfoText(
          "Check your email to verify your account, then log in."
        );
        // Optionally send them back to login:
        // router.replace("/login");
      }
    } catch (e: any) {
      console.error("Unexpected sign up error:", e);
      setErrorText("Unexpected error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Back to login */}
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => router.replace("/login")}
      >
        <ArrowLeft size={20} color="#E5E7EB" />
        <Text style={styles.backText}>Back to Login</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Sign up to start organizing your syllabi.
        </Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />
        </View>

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
              placeholder="Enter password"
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

        {/* Confirm Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, paddingRight: 40 }]}
              placeholder="Re-enter password"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? (
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

        {/* Submit button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSignup}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#0B1220" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        {/* Already have account */}
        <TouchableOpacity
          style={styles.inlineLinkRow}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.inlineText}>
            Already have an account?{" "}
          </Text>
          <Text style={styles.inlineLink}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617", // dark, matches login vibe
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backText: {
    color: "#E5E7EB",
    marginLeft: 6,
    fontSize: 14,
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
    fontSize: 22,
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
