// components/DraftEditorModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { Trash2, X } from "lucide-react-native";
import {
  Draft,
  labelFromSemesterYear,
} from "./AssignmentsContext";
import { colors } from "../constant/colors";

type DraftEditorModalProps = {
  visible: boolean;
  initialDrafts: Draft[];
  onClose: () => void;
  onSave: (drafts: Draft[]) => void;
};

export default function DraftEditorModal({
  visible,
  initialDrafts,
  onClose,
  onSave,
}: DraftEditorModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (visible) {
      setDrafts(initialDrafts || []);
    }
  }, [visible, initialDrafts]);

  const updateDraft = (
    id: string,
    field: keyof Draft,
    value: any
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSave = () => {
    onSave(drafts);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              Review Assignments
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            These assignments were extracted from your
            image. Edit anything that looks off, or delete
            rows you don’t want to keep.
          </Text>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {drafts.map((d) => {
              const termLabel = labelFromSemesterYear(
                d.semester,
                d.year
              );

              return (
                <View key={d.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardLabel}>
                        Assignment title
                      </Text>
                      {termLabel ? (
                        <Text style={styles.termLabel}>
                          {termLabel}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteDraft(d.id)}
                    >
                      <Trash2
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.input}
                    value={d.title}
                    onChangeText={(t) =>
                      updateDraft(d.id, "title", t)
                    }
                    placeholder="Assignment title"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />

                  <Text style={styles.cardLabel}>
                    Class name
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={d.course}
                    onChangeText={(t) =>
                      updateDraft(d.id, "course", t)
                    }
                    placeholder="e.g., CS 370 – Algorithms"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />

                  <Text style={styles.cardLabel}>
                    Due date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={d.dueISO || ""}
                    onChangeText={(t) =>
                      updateDraft(d.id, "dueISO", t)
                    }
                    placeholder="2025-09-12"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />

                  <Text style={styles.cardLabel}>
                    Description
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    multiline
                    textAlignVertical="top"
                    value={d.description || ""}
                    onChangeText={(t) =>
                      updateDraft(d.id, "description", t)
                    }
                    placeholder="Optional details…"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />
                </View>
              );
            })}

            {drafts.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No assignments to review.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                Save to Planner
              </Text>
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
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  sub: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  termLabel: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 4,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  primaryBtn: {
    backgroundColor: "#4F46E5",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
