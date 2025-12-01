// app/classes.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import {
  useAssignments,
  isOverdue,
  within7Days,
} from "../components/AssignmentsContext";
import ClassFolderCard from "../components/ClassFolderCard";
import { colors } from "../constant/colors";

type ClassFolder = {
  id: string;
  course: string;
  semesterLabel?: string;
  color?: string;
  overdue: number;
  upcoming: number;
};

export default function ClassesScreen() {
  const { assignments } = useAssignments();
  const [selectedSemester, setSelectedSemester] =
    useState<string>("All");

  // Build class folders from assignments
  const classFolders: ClassFolder[] = useMemo(() => {
    const map = new Map<string, ClassFolder>();

    assignments.forEach((a) => {
      const meta = a as any;
      const semesterLabel: string | undefined =
        meta.semesterLabel || undefined;
      const folderColor: string | undefined =
        meta.color || undefined;

      const key = `${a.course || "Unknown"}::${semesterLabel || "none"}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          course: a.course || "Untitled class",
          semesterLabel,
          color: folderColor,
          overdue: 0,
          upcoming: 0,
        });
      }
      const entry = map.get(key)!;

      if (isOverdue(a.dueISO || null)) {
        entry.overdue += 1;
      } else if (within7Days(a.dueISO || null)) {
        entry.upcoming += 1;
      }
    });

    return Array.from(map.values());
  }, [assignments]);

  // unique semester labels
  const semesterOptions = useMemo(() => {
    const s = new Set<string>();
    classFolders.forEach((f) => {
      if (f.semesterLabel) s.add(f.semesterLabel);
    });
    const arr = Array.from(s).sort();
    return ["All", ...arr];
  }, [classFolders]);

  const filteredFolders = useMemo(() => {
    if (selectedSemester === "All") return classFolders;
    return classFolders.filter(
      (f) => f.semesterLabel === selectedSemester
    );
  }, [classFolders, selectedSemester]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Classes</Text>
        <Text style={styles.subtitle}>
          View your classes by folder. Filter by semester to stay
          organized.
        </Text>
      </View>

      {/* Semester chips (fixes the big purple "All" bar) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.semesterScroll}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {semesterOptions.map((label) => (
          <SemesterChip
            key={label}
            label={label}
            active={selectedSemester === label}
            onPress={() => setSelectedSemester(label)}
          />
        ))}
      </ScrollView>

      {/* Class folders */}
      <View style={{ gap: 14, marginTop: 8 }}>
        {filteredFolders.length === 0 ? (
          <Text style={styles.emptyText}>
            No classes yet for this semester. Try uploading a syllabus
            or adding a class with the + button.
          </Text>
        ) : (
          filteredFolders.map((f) => (
            <ClassFolderCard
              key={f.id}
              course={f.course}
              semesterLabel={f.semesterLabel}
              folderColor={f.color}
              overdueCount={f.overdue}
              upcomingCount={f.upcoming}
              // You can later wire this into a real "edit class" modal
              onEditClass={() => {
                // placeholder for now
                // e.g. open an EditClassModal
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function SemesterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.semesterChip,
        active && styles.semesterChipActive,
      ]}
    >
      <Text
        style={[
          styles.semesterChipText,
          active && styles.semesterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBackground,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 14,
  },
  semesterScroll: {
    marginTop: 4,
    marginBottom: 8,
  },
  semesterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.chipBackground,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  semesterChipActive: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  semesterChipText: {
    fontWeight: "600",
    color: colors.textSecondary,
    fontSize: 13,
  },
  semesterChipTextActive: {
    color: "#FFFFFF",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
