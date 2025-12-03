// app/(protected)/profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [now, setNow] = useState(new Date());
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [password, setPassword] = useState("");

  // keep header time updated
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // hydrate from auth user
  useEffect(() => {
    if (!user) return;

    setStudentEmail(user.email ?? "");

    const meta: any = user.user_metadata || {};
    const nameFromMeta =
      meta.full_name || meta.name || meta.username;
    if (nameFromMeta) {
      setStudentName(nameFromMeta);
    }
  }, [user]);

  const timeLabel = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const initials =
    (studentName || "Student")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "ST";

  const handleSaveProfile = () => {
    // You can later connect this to Supabase to update user metadata.
    Alert.alert(
      "Profile saved",
      "Your profile info will sync with your account in a future version."
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      // even if signOut fails, still try to push back to login
    } finally {
      router.replace("/login");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome! 📚</Text>
        <Text style={styles.sub}>
          {timeLabel} • {dateLabel}
        </Text>
      </View>

      {/* Profile row */}
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View>
          <Text style={styles.profileLabel}>Profile</Text>
          {studentEmail ? (
            <Text style={styles.profileEmail}>
              {studentEmail}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Student Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#9CA3AF"
          value={studentName}
          onChangeText={setStudentName}
        />

        <Text style={styles.fieldLabel}>Student Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@school.edu"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={studentEmail}
          onChangeText={setStudentEmail}
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Set / change password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.9}
          onPress={handleSaveProfile}
        >
          <Text style={styles.saveText}>Save Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.9}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 18,
  },
  welcome: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 14,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 22,
  },
  profileLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  profileEmail: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#111827",
    marginBottom: 10,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 15,
  },
});
