// app/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from '../context/AuthContext';

export default function LoginScreen( { navigation }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  // New: controls the mini popup
  const [showGuide, setShowGuide] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Please enter both email and password.");
      return;
    }

    setLoading(true);
    

    try {
      // TODO: Replace this with Supabase auth later:
      const { data, error } = await signIn(email, password);

      setLoading(false);
      setShowGuide(true);
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Login error", e?.message || "Something went wrong.");
    }
  };

  const handleStartApp = () => {
    // After the mini guide, take them into the app (Home tab)
    setShowGuide(false);
    router.replace("/home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>pixelATE</Text>
          <Text style={styles.welcome}>Welcome back 👋</Text>
          <Text style={styles.sub}>
            Log in to see your classes, assignments, and calendar.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputRow}>
            <Mail size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="your.email@school.edu"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputRow}>
            <Lock size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.showBtn}
            >
              <Text style={styles.showText}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Forgot password (stub) */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Forgot password",
                "Hook this up to Supabase reset later."
              )
            }
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Logging in..." : "Log in"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="dividerRow" style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Placeholder for future social/SSO login */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              Alert.alert(
                "Social login",
                "Add Google/Apple login with Supabase later."
              )
            }
          >
            <Text style={styles.secondaryBtnText}>Continue with school SSO</Text>
          </TouchableOpacity>
        </View>

        {/* Footer link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* MINI HOW-TO POPUP */}
      {showGuide && (
        <View style={styles.guideOverlay}>
          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>How to use pixelATE</Text>
            <Text style={styles.guideSubtitle}>
              A quick guide before you start ✨
            </Text>

            <View style={styles.guideList}>
              <Text style={styles.guideItem}>
                • Tap the <Text style={styles.guideBold}>+</Text> button to{" "}
                <Text style={styles.guideBold}>Upload Syllabus</Text> (PDF, image,
                or pasted text).
              </Text>
              <Text style={styles.guideItem}>
                • On <Text style={styles.guideBold}>Home</Text>, see{" "}
                <Text style={styles.guideBold}>Today’s</Text> assignments,
                upcoming, and overdue — filter by class once you’ve uploaded.
              </Text>
              <Text style={styles.guideItem}>
                • Use <Text style={styles.guideBold}>Classes</Text> to view all
                assignments by class, and <Text style={styles.guideBold}>Calendar</Text>{" "}
                to see what’s due each day (month / week / day views).
              </Text>
            </View>

            <TouchableOpacity
              style={styles.guideButton}
              onPress={handleStartApp}
            >
              <Text style={styles.guideButtonText}>Start using pixelATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 24,
  },
  appName: {
    color: "#A78BFA",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  welcome: {
    color: "#F9FAFB",
    fontSize: 28,
    fontWeight: "800",
  },
  sub: {
    color: "#9CA3AF",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  label: {
    color: "#9CA3AF",
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#020617",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  input: {
    flex: 1,
    color: "#F9FAFB",
  },
  showBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  showText: {
    color: "#A78BFA",
    fontWeight: "600",
    fontSize: 12,
  },
  forgotText: {
    alignSelf: "flex-end",
    marginTop: 8,
    color: "#E5E7EB",
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#F9FAFB",
    fontWeight: "800",
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#1F2937",
  },
  dividerText: {
    color: "#6B7280",
    marginHorizontal: 10,
    fontSize: 12,
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  footerText: {
    color: "#9CA3AF",
    marginRight: 4,
  },
  footerLink: {
    color: "#A78BFA",
    fontWeight: "700",
  },

  /* Guide overlay styles */
  guideOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  guideCard: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  guideTitle: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "800",
  },
  guideSubtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 12,
  },
  guideList: {
    marginBottom: 16,
  },
  guideItem: {
    color: "#E5E7EB",
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  guideBold: {
    fontWeight: "700",
    color: "#C4B5FD",
  },
  guideButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  guideButtonText: {
    color: "#F9FAFB",
    fontWeight: "800",
    fontSize: 15,
  },
});
