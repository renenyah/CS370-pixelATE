// components/HowToUseModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { colors } from "../constant/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HowToUseModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to PixelATE 📚</Text>
          <Text style={styles.subtitle}>
            Here’s how to get started:
          </Text>

          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              Tap the <Text style={{ fontWeight: "700" }}>+</Text> button to upload a syllabus (PDF, image, or pasted text).
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              Choose the <Text style={{ fontWeight: "700" }}>class, semester, and color</Text> so your folder stays organized.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              Use <Text style={{ fontWeight: "700" }}>Classes</Text> to see folders and{" "}
              <Text style={{ fontWeight: "700" }}>Calendar</Text> to see everything by date.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it, let’s go!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bulletDot: {
    marginRight: 8,
    color: colors.textPrimary,
    fontSize: 16,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
  },
  button: {
    marginTop: 14,
    backgroundColor: colors.lavender,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
