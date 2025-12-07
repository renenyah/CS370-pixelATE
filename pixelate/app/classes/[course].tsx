// app/classes/[course].tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  useAssignments,
  Assignment,
  AssignmentType,
  safeISO,
  normalizeKey,
} from "../../components/AssignmentsContext";
import { colors } from "../../constant/colors";

const TYPE_OPTIONS: AssignmentType[] = [
  "Assignment",
  "Quiz",
  "Test",
  "Project",
  "Discussion",
  "Reading",
  "Art",
  "Other",
];

export default function ClassDetailScreen() {
  const { assignments, updateAssignment } = useAssignments();
  const params = useLocalSearchParams<{ course?: string }>();

  const rawCourse = Array.isArray(params.course)
    ? params.course[0]
    : params.course || "";

  const routeKey = normalizeKey(rawCourse);

  // All assignments for this course (case-insensitive)
  const items = useMemo(
    () =>
      assignments
        .filter((a) => normalizeKey(a.course) === routeKey)
        .sort((a, b) =>
          (a.dueISO || "").localeCompare(b.dueISO || "")
        ),
    [assignments, routeKey]
  );

  // Pick a nice display name
  const displayCourseName = useMemo(() => {
    const match = assignments.find(
      (a) => normalizeKey(a.course) === routeKey
    );
    return match?.course || rawCourse || "Untitled Course";
  }, [assignments, routeKey, rawCourse]);

  // ---------- edit modal state ----------
  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(
    null
  );
  const [editTitle, setEditTitle] = useState("");
  const [editCourse, setEditCourse] = useState(displayCourseName);
  const [editType, setEditType] =
    useState<AssignmentType>("Assignment");
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTime, setEditTime] = useState("11:59pm");

  const openEdit = (a: Assignment) => {
    setEditing(a);
    setEditTitle(a.title);
    setEditCourse(a.course || displayCourseName);
    setEditType(a.type || "Assignment");
    setEditDate(a.dueISO || "");
    setEditDesc(a.description || "");
    setEditTime("11:59pm");
    setEditVisible(true);
  };

  const closeEdit = () => {
    setEditVisible(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!editing) return;

    const trimmedTitle = editTitle.trim();
    const trimmedCourse = editCourse.trim();

    if (!trimmedTitle) {
      console.warn("Missing title");
      return;
    }

    const normalizedDate = safeISO(editDate || null);

    updateAssignment(editing.id, {
      title: trimmedTitle,
      course: trimmedCourse || editing.course,
      type: editType,
      dueISO: normalizedDate,
      description: editDesc.trim(),
    });

    closeEdit();
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {displayCourseName}
          </Text>
          <Text style={styles.sub}>
            All assignments for this class.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No assignments yet for this class.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((a) => {
              const dueLabel = a.dueISO
                ? new Date(
                    a.dueISO + "T00:00:00"
                  ).toLocaleDateString()
                : undefined;

              return (
                <View key={a.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {a.title}
                    </Text>
                    {a.type && (
                      <Text style={styles.cardType}>
                        {a.type}
                      </Text>
                    )}
                    {dueLabel && (
                      <Text style={styles.cardMeta}>
                        Due {dueLabel}
                      </Text>
                    )}
                    {a.description && (
                      <Text style={styles.cardDesc}>
                        {a.description}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEdit(a)}
                  >
                    <Text style={styles.editBtnText}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Edit assignment
            </Text>
            <Text style={styles.modalSub}>
              Update the title, class, type, due date, and description. Time is
              assumed to be 11:59pm for schedule logic.
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text style={styles.modalLabel}>
                Title
              </Text>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Assignment title"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
              />

              <Text style={styles.modalLabel}>
                Class name
              </Text>
              <TextInput
                style={styles.input}
                value={editCourse}
                onChangeText={setEditCourse}
                placeholder="e.g., CS 370 – Algorithms"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
              />

              <Text style={styles.modalLabel}>
                Assignment type
              </Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = editType === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.typeChip,
                        active &&
                          styles.typeChipActive,
                      ]}
                      onPress={() => setEditType(opt)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          active &&
                            styles
                              .typeChipTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>
                Due date (YYYY-MM-DD)
              </Text>
              <TextInput
                style={styles.input}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="2025-12-06"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
              />

              <Text style={styles.modalLabel}>
                Due time (notes only)
              </Text>
              <TextInput
                style={styles.input}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="11:59pm"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
              />

              <Text style={styles.modalLabel}>
                Description (optional)
              </Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                textAlignVertical="top"
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Notes or details…"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
              />
            </ScrollView>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.cancelBtn,
                ]}
                onPress={closeEdit}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.saveBtn,
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>
                  Save changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 15,
  },
  cardType: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#7C3AED",
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#4B5563",
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
  },
  editBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  modalSub: {
    marginTop: 6,
    marginBottom: 10,
    color: colors.textSecondary,
    fontSize: 13,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
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
  saveBtn: {
    backgroundColor: colors.blue,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
