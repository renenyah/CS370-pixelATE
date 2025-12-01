// components/DraftEditorModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { X, Trash2 } from "lucide-react-native";

import {
  Draft,
  useAssignments,
  safeISO,
} from "./AssignmentsContext";
import { colors } from "../lib/colors";

type Props = {
  visible: boolean;
  drafts: Draft[];
  setDrafts: (drafts: Draft[]) => void;
  onCancel: () => void;
  onDone: () => void;
};

export default function DraftEditorModal({
  visible,
  drafts,
  setDrafts,
  onCancel,
  onDone,
}: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  const updateDraft = (
    id: string,
    field: keyof Draft,
    value: string
  ) => {
    setDrafts(
      drafts.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const handleDelete = (id: string) => {
    setDrafts(drafts.filter((d) => d.id !== id));
  };

  const handleSave = () => {
    if (!drafts.length) {
      onDone();
      return;
    }

    // normalize dates before saving
    const cleaned = drafts.map((d) => ({
      ...d,
      dueISO: safeISO(d.dueISO || null),
    }));

    addAssignmentsFromDrafts(cleaned);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              Review extracted assignments
            </Text>
            <TouchableOpacity onPress={onCancel}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Check the titles, class names, and due dates. You can
            delete anything that looks wrong before saving.
          </Text>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {drafts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No assignments in this batch.
                </Text>
              </View>
            ) : (
              drafts.map((d) => (
                <View key={d.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>
                      Assignment title
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDelete(d.id)}
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
                    placeholder="e.g., AS 110-3 – Rome Sketchbook"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />

                  <Text style={styles.cardLabel}>
                    Due date (YYYY-MM-DD or any parseable date)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={d.dueISO || ""}
                    onChangeText={(t) =>
                      updateDraft(d.id, "dueISO", t)
                    }
                    placeholder="2025-02-03"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />

                  <Text style={styles.cardLabel}>
                    Description (optional)
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    multiline
                    textAlignVertical="top"
                    value={d.description || ""}
                    onChangeText={(t) =>
                      updateDraft(d.id, "description", t)
                    }
                    placeholder="Add notes or details…"
                    placeholderTextColor={
                      colors.textSecondary + "99"
                    }
                  />
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={handleSave}
            >
              <Text style={styles.primaryText}>
                Save assignments
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
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
    color: colors.textPrimary,
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 10,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  primaryBtn: {
    backgroundColor: colors.blue,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },
});
