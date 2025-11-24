// app/signup.tsx
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
import { Mail, Lock, User } from "lucide-react-native";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with Supabase signUp call later:
      // const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });

      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          "Sign up",
          "Account creation UI only. Connect Supabase here later."
        );
        // Example: after real signup, maybe go to login:
        // router.replace("/login");
      }, 500);
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Signup error", e?.message || "Something went wrong.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View style={styles.inner}>
        {/* Title / tagline */}
        <View style={styles.header}>
          <Text style={styles.appName}>pixelATE</Text>
          <Text style={styles.welcome}>Create your account ✨</Text>
          <Text style={styles.sub}>
            Sign up to start uploading syllabi and tracking assignments.
          </Text>
        </View>

        <View style={styles.card}>
          {/* Name */}
          <Text style={styles.label}>Full name</Text>
          <View style={styles.inputRow}>
            <User size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="First Last"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

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
              placeholder="Create a password"
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

          {/* Confirm password */}
          <Text style={styles.label}>Confirm password</Text>
          <View style={styles.inputRow}>
            <Lock size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Re-type your password"
              placeholderTextColor="#9CA3AF"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Sign up button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Creating account..." : "Sign up"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
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
    fontSize: 26,
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
  primaryBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 20,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#F9FAFB",
    fontWeight: "800",
    fontSize: 16,
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
});
