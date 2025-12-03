// components/DraftEditorModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { X, Trash2 } from "lucide-react-native";
import {
  Draft,
  AssignmentType,
} from "./AssignmentsContext";
import { colors } from "../constant/colors";

type DraftEditorModalProps = {
  visible: boolean;
  initialDrafts: Draft[];
  onClose: () => void;
  onSave: (drafts: Draft[]) => void;
};

const TYPE_OPTIONS: AssignmentType[] = [
  "Assignment",
  "Quiz",
  "Test",
  "Project",
  "Reading",
  "Discussion",
  "Art",
  "Other",
];

function nextDraftId(): string {
  return `d_${Math.random().toString(36).slice(2, 10)}`;
}

export default function DraftEditorModal({
  visible,
  initialDrafts,
  onClose,
  onSave,
}: DraftEditorModalProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Reset local drafts whenever modal opens or initialDrafts change
  useEffect(() => {
    if (!visible) return;
    if (initialDrafts && initialDrafts.length > 0) {
      setDrafts(initialDrafts);
    } else {
      setDrafts([
        {
          id: nextDraftId(),
          title: "",
          course: "",
          type: "Assignment",
          dueISO: null,
          description: "",
        },
      ]);
    }
  }, [visible, initialDrafts]);

  const updateDraftField = (
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

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) =>
      prev.length <= 1 ? prev : prev.filter((d) => d.id !== id)
    );
  };

  const handleAddDraft = () => {
    const base = drafts[0];
    setDrafts((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        title: "",
        course: base?.course || "",
        type: "Assignment",
        dueISO: null,
        description: "",
        semester: base?.semester,
        year: base?.year,
        semesterLabel: base?.semesterLabel,
        color: base?.color,
      },
    ]);
  };

  const handleSave = () => {
    // basic trim
    const cleaned = drafts.map((d) => ({
      ...d,
      title: d.title.trim(),
      course: d.course.trim(),
    }));
    onSave(cleaned);
    onClose();
  };

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
            <Text style={styles.title}>Review assignments</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Edit anything that looks off, change the assignment
            type, or delete rows you don’t want to keep.
          </Text>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {drafts.map((d) => (
              <View key={d.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLabel}>
                    Assignment title
                  </Text>
                  {drafts.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleDeleteDraft(d.id)}
                    >
                      <Trash2
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.input}
                  value={d.title}
                  onChangeText={(t) =>
                    updateDraftField(d.id, "title", t)
                  }
                  placeholder="Assignment title"
                  placeholderTextColor={
                    colors.textSecondary + "99"
                  }
                />

                <Text style={styles.cardLabel}>Class name</Text>
                <TextInput
                  style={styles.input}
                  value={d.course}
                  onChangeText={(t) =>
                    updateDraftField(d.id, "course", t)
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
                    updateDraftField(d.id, "dueISO", t)
                  }
                  placeholder="2025-02-03"
                  placeholderTextColor={
                    colors.textSecondary + "99"
                  }
                />

                <Text style={styles.cardLabel}>
                  Assignment type
                </Text>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = d.type === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() =>
                          updateDraftField(d.id, "type", opt)
                        }
                        style={[
                          styles.typeChip,
                          active && styles.typeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            active &&
                              styles.typeChipTextActive,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.cardLabel}>
                  Description (optional)
                </Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  multiline
                  textAlignVertical="top"
                  value={d.description || ""}
                  onChangeText={(t) =>
                    updateDraftField(
                      d.id,
                      "description",
                      t
                    )
                  }
                  placeholder="Notes or details…"
                  placeholderTextColor={
                    colors.textSecondary + "99"
                  }
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addRowButton}
              onPress={handleAddDraft}
            >
              <Text style={styles.addRowText}>
                + Add another assignment
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
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
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFFFFF",
  },
  typeChipActive: {
    backgroundColor: colors.chipActiveBackground,
    borderColor: colors.chipActiveBackground,
  },
  typeChipText: {
    fontSize: 12,
    color: colors.chipText,
    fontWeight: "600",
  },
  typeChipTextActive: {
    color: colors.chipTextActive,
  },
  addRowButton: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: "center",
  },
  addRowText: {
    color: colors.blue,
    fontWeight: "700",
    fontSize: 13,
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
