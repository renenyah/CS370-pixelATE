// app/classes.tsx
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
import { useRouter } from "expo-router";

import {
  useAssignments,
  ClassFolder,
  normalizeKey,
} from "../components/AssignmentsContext";
import { colors } from "../constant/colors";

type FolderView = {
  name: string;
  color: string;
  semester?: string;
  year?: number;
  assignmentCount: number;
};

const SEMESTER_CHOICES = ["Spring", "Summer", "Fall"] as const;

export default function ClassesScreen() {
  const router = useRouter();
  const { assignments, classes, updateClassFolder } =
    useAssignments();

  const [semesterFilter, setSemesterFilter] =
    useState<string>("All");

  // edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editingOriginalName, setEditingOriginalName] =
    useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editSemester, setEditSemester] =
    useState<string>("Fall");
  const [editYear, setEditYear] = useState<string>("");

  const folders: FolderView[] = useMemo(() => {
    // key = normalized course name
    const map = new Map<string, FolderView>();

    // Start from explicit class folders
    classes.forEach((c: ClassFolder) => {
      const key = normalizeKey(c.name);
      if (!key) return;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name: c.name,
          color: c.color,
          semester: c.semester,
          year: c.year,
          assignmentCount: 0,
        });
      }
    });

    // Add courses inferred from assignments
    assignments.forEach((a) => {
      if (!a.course) return;
      const key = normalizeKey(a.course);
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.assignmentCount += 1;
        if (!existing.semester && a.semester) {
          existing.semester = a.semester;
        }
        if (!existing.year && a.year) {
          existing.year = a.year;
        }
      } else {
        map.set(key, {
          name: a.course,
          color: a.color || colors.lavender,
          semester: a.semester,
          year: a.year,
          assignmentCount: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [classes, assignments]);

  const semesterOptions = useMemo(() => {
    const s = new Set<string>();
    folders.forEach((f) => {
      if (f.semester && f.year) {
        s.add(`${f.semester} ${f.year}`);
      }
    });
    return Array.from(s).sort();
  }, [folders]);

  const filteredFolders = useMemo(() => {
    if (semesterFilter === "All") return folders;
    return folders.filter(
      (f) =>
        f.semester &&
        f.year &&
        `${f.semester} ${f.year}` === semesterFilter
    );
  }, [folders, semesterFilter]);

  // ---- edit helpers ----
  const openEditModalForFolder = (f: FolderView) => {
    setEditingOriginalName(f.name);
    setEditName(f.name);
    setEditSemester(f.semester || "Fall");
    setEditYear(
      f.year ? String(f.year) : String(new Date().getFullYear())
    );
    setEditVisible(true);
  };

  const closeEditModal = () => {
    setEditVisible(false);
  };

  const handleSaveEdit = () => {
    const newName = editName.trim() || editingOriginalName;
    const yrNum = parseInt(editYear, 10);
    updateClassFolder({
      oldName: editingOriginalName,
      newName,
      semester: editSemester,
      year: Number.isNaN(yrNum) ? undefined : yrNum,
    });
    setEditVisible(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Classes</Text>
          <Text style={styles.sub}>
            View all your class folders and the assignments inside them.
          </Text>
        </View>

        {/* Semester filter chips */}
        {semesterOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            <FilterChip
              label="All semesters"
              active={semesterFilter === "All"}
              onPress={() => setSemesterFilter("All")}
            />
            {semesterOptions.map((opt) => (
              <FilterChip
                key={opt}
                label={opt}
                active={semesterFilter === opt}
                onPress={() => setSemesterFilter(opt)}
              />
            ))}
          </ScrollView>
        )}

        {filteredFolders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No classes yet</Text>
            <Text style={styles.emptySub}>
              Use the + button to add a class folder or upload a syllabus.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredFolders.map((f) => {
              const semesterLabel =
                f.semester && f.year
                  ? `${f.semester} ${f.year}`
                  : undefined;

              return (
                <View
                  key={f.name}
                  style={[
                    styles.folderCard,
                    {
                      borderColor: f.color || colors.lavender,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorBar,
                      {
                        backgroundColor: f.color || colors.lavender,
                      },
                    ]}
                  />
                  <View style={styles.folderBody}>
                    <Text style={styles.folderName}>{f.name}</Text>
                    {semesterLabel && (
                      <Text style={styles.folderMeta}>
                        {semesterLabel}
                      </Text>
                    )}
                    <Text style={styles.folderMeta}>
                      {`${f.assignmentCount} assignment${
                        f.assignmentCount === 1 ? "" : "s"
                      }`}
                    </Text>

                    <View style={styles.folderActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModalForFolder(f)}
                      >
                        <Text style={styles.editButtonText}>
                          Edit
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() =>
                          router.push({
                            pathname: "/classes/[course]",
                            params: {
                              course: f.name,
                            },
                          })
                        }
                      >
                        <Text style={styles.viewButtonText}>
                          View
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Class Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit class</Text>

            <Text style={styles.modalLabel}>Class name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g., CS 370 – Algorithms"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Semester</Text>
            <View style={styles.semesterRow}>
              {SEMESTER_CHOICES.map((sem) => {
                const active = editSemester === sem;
                return (
                  <TouchableOpacity
                    key={sem}
                    style={[
                      styles.semChip,
                      active && styles.semChipActive,
                    ]}
                    onPress={() => setEditSemester(sem)}
                  >
                    <Text
                      style={[
                        styles.semChipText,
                        active && styles.semChipTextActive,
                      ]}
                    >
                      {sem}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>Year</Text>
            <TextInput
              style={styles.modalInput}
              value={editYear}
              onChangeText={setEditYear}
              placeholder="2025"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={closeEditModal}
              >
                <Text style={styles.modalCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSave]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalSaveText}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && styles.filterChipActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  sub: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySub: {
    marginTop: 4,
    color: "#6B7280",
    textAlign: "center",
  },
  folderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  colorBar: {
    height: 6,
    width: "100%",
  },
  folderBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  folderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  folderMeta: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
  },
  folderActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E0E7FF",
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },
  semesterRow: {
    flexDirection: "row",
    gap: 6,
  },
  semChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  semChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  semChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  semChipTextActive: {
    color: "#FFFFFF",
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: "#E5E7EB",
  },
  modalSave: {
    backgroundColor: "#7C3AED",
  },
  modalCancelText: {
    color: "#111827",
    fontWeight: "700",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
