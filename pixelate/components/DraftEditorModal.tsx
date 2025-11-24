// components/DraftEditorModal.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { X, Trash2, Save } from "lucide-react-native";
import { Draft, safeISO } from "./AssignmentsContext";

type Props = {
  visible: boolean;
  drafts: Draft[];
  onChangeDrafts: (drafts: Draft[]) => void;
  onClose: () => void;
  onStartOver: () => void;
  onSave: () => void;
};

export default function DraftEditorModal({
  visible,
  drafts,
  onChangeDrafts,
  onClose,
  onStartOver,
  onSave,
}: Props) {
  const updateDraft = (id: string, patch: Partial<Draft>) => {
    onChangeDrafts(
      drafts.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  };

  const removeDraft = (id: string) => {
    onChangeDrafts(drafts.filter((d) => d.id !== id));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Review & Edit</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Found {drafts.length} assignment
            {drafts.length === 1 ? "" : "s"}. Tap to edit, delete,
            or adjust dates before saving.
          </Text>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {drafts.map((d, idx) => (
              <View key={d.id} style={styles.card}>
                <Text style={styles.index}>#{idx + 1}</Text>

                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={d.title}
                  onChangeText={(v) =>
                    updateDraft(d.id, { title: v })
                  }
                  placeholder="Assignment title"
                  placeholderTextColor="#9CA3AF"
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.label}>Course</Text>
                    <TextInput
                      style={styles.input}
                      value={d.course}
                      onChangeText={(v) =>
                        updateDraft(d.id, { course: v })
                      }
                      placeholder="e.g., CS 370"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.label}>Type</Text>
                    <TextInput
                      style={styles.input}
                      value={d.type}
                      onChangeText={(v) =>
                        updateDraft(d.id, {
                          type: (v ||
                            "Assignment") as Draft["type"],
                        })
                      }
                      placeholder="Assignment / Quiz / Test…"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <Text style={styles.label}>
                  Due Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={styles.input}
                  value={d.dueISO || ""}
                  onChangeText={(v) =>
                    updateDraft(d.id, { dueISO: safeISO(v) })
                  }
                  placeholder="2025-11-09"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>
                  Description (optional)
                </Text>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  multiline
                  textAlignVertical="top"
                  value={d.description || ""}
                  onChangeText={(v) =>
                    updateDraft(d.id, { description: v })
                  }
                  placeholder="Extra details…"
                  placeholderTextColor="#9CA3AF"
                />

                <View style={styles.footerRow}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeDraft(d.id)}
                  >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onStartOver}
            >
              <Text style={styles.secondaryText}>Start Over</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onSave}
            >
              <Save size={18} color="#fff" />
              <Text style={styles.primaryText}>Save All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sub: {
    marginTop: 6,
    marginBottom: 10,
    color: "#6B7280",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  index: {
    color: "#6B7280",
    fontWeight: "700",
    marginBottom: 6,
  },
  label: {
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#111827",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    marginTop: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryText: {
    fontWeight: "700",
    color: "#FFFFFF",
    fontSize: 14,
    marginLeft: 4,
  },
});
