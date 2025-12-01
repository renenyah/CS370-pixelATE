// app/login.tsx
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
import { Mail, Lock } from "lucide-react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from '../context/AuthContext';


const COLORS = {
  bg: "#FDF2FF", // soft background
  card: "#FFFFFF",
  primary: "#A2D2FF",
  primaryDark: "#6498C6",
  accent: "#FFC8DD",
  accent2: "#CDB4DB",
  textMain: "#111827",
  textSub: "#6B7280",
  border: "#E5E7EB",
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if(error) {
      Alert.alert('Login Failed', error.message);
    }

  }

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
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>
            Log in to see your classes, assignments, and calendar.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor={COLORS.textSub}
          />

          <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPw}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor={COLORS.textSub}
            />
            <TouchableOpacity
              style={styles.showButton}
              onPress={() => setShowPw((prev) => !prev)}
            >
              {showPw ? (
                <EyeOff size={18} color={COLORS.textSub} />
              ) : (
                <Eye size={18} color={COLORS.textSub} />
              )}
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={onLogin}>
            <Text style={styles.primaryButtonText}>Log in</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.secondaryButton} disabled>
            <Text style={styles.secondaryButtonText}>
              Continue with school SSO
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.footerLink}> Sign up</Text>
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
    fontSize: 32,
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
    marginBottom: 6,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  showButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: COLORS.textSub,
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: COLORS.textMain,
    fontWeight: "600",
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
