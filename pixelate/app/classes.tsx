// app/classes.tsx
import React, {
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

import {
  useAssignments,
  ClassFolder,
} from "../components/AssignmentsContext";
import { colors } from "../constant/colors";

type FolderView = {
  name: string;
  color: string;
  semester?: string;
  year?: number;
  assignmentCount: number;
};

export default function ClassesScreen() {
  const router = useRouter();
  const { assignments, classes } = useAssignments();

  const [semesterFilter, setSemesterFilter] =
    useState<string>("All");

  const folders: FolderView[] = useMemo(() => {
    const map = new Map<string, FolderView>();

    // Start from explicit class folders
    classes.forEach((c: ClassFolder) => {
      const key = c.name;
      map.set(key, {
        name: c.name,
        color: c.color,
        semester: c.semester,
        year: c.year,
        assignmentCount: 0,
      });
    });

    // Add courses inferred from assignments
    assignments.forEach((a) => {
      if (!a.course) return;
      const existing = map.get(a.course);
      if (existing) {
        existing.assignmentCount += 1;
        // fill missing sem/year if present on assignment
        if (!existing.semester && a.semester) {
          existing.semester = a.semester;
        }
        if (!existing.year && a.year) {
          existing.year = a.year;
        }
      } else {
        map.set(a.course, {
          name: a.course,
          color:
            a.color ||
            colors.lavender /* fallback */,
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
        `${f.semester} ${f.year}` ===
          semesterFilter
    );
  }, [folders, semesterFilter]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Classes</Text>
          <Text style={styles.sub}>
            View all your class folders and the
            assignments inside them.
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
                onPress={() =>
                  setSemesterFilter(opt)
                }
              />
            ))}
          </ScrollView>
        )}

        {filteredFolders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No classes yet
            </Text>
            <Text style={styles.emptySub}>
              Use the + button to add a class
              folder or upload a syllabus.
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
                      borderColor:
                        f.color || colors.lavender,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.colorBar,
                      {
                        backgroundColor:
                          f.color || colors.lavender,
                      },
                    ]}
                  />
                  <View style={styles.folderBody}>
                    <Text style={styles.folderName}>
                      {f.name}
                    </Text>
                    {semesterLabel && (
                      <Text
                        style={styles.folderMeta}
                      >
                        {semesterLabel}
                      </Text>
                    )}
                    <Text
                      style={styles.folderMeta}
                    >{`${f.assignmentCount} assignment${
                      f.assignmentCount === 1
                        ? ""
                        : "s"
                    }`}</Text>

                    <View style={styles.folderActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() =>
                          router.push({
                            pathname:
                              "/classes/[course]",
                            params: {
                              course: f.name,
                            },
                          })
                        }
                      >
                        <Text
                          style={styles.viewButtonText}
                        >
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
});
