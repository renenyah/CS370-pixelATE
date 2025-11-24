// app/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Clock } from "lucide-react-native";

type CourseFilter = "All" | string;

type Assignment = {
  id: string;
  title: string;
  course: string;
  dueISO: string; // YYYY-MM-DD
};

const MOCK_ASSIGNMENTS: Assignment[] = [
  // leave empty or add sample assignments here
  // {
  //   id: "1",
  //   title: "Essay Draft",
  //   course: "Cs 370",
  //   dueISO: "2025-11-23",
  // },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(iso: string) {
  return iso === todayISO();
}

export default function HomeScreen() {
  const [now, setNow] = useState(new Date());
  const [selectedCourse, setSelectedCourse] = useState<CourseFilter>("All");

  // fake “courses” from assignments – you’ll replace this with real data later
  const courses: string[] = useMemo(() => {
    const s = new Set<string>();
    MOCK_ASSIGNMENTS.forEach((a) => s.add(a.course));
    // for design demo / screenshot – add a couple example courses:
    if (s.size === 0) {
      s.add("Cs 370");
      s.add("Rome sketchbook");
    }
    return Array.from(s);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

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

  const assignmentsToday = useMemo(() => {
    const base = MOCK_ASSIGNMENTS.filter((a) => isToday(a.dueISO));
    if (selectedCourse === "All") return base;
    return base.filter((a) => a.course === selectedCourse);
  }, [selectedCourse]);

  // For now keep counts simple – later you’ll compute from real data
  const upcomingCount = 0;
  const overdueCount = 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome! 📚</Text>
        <Text style={styles.sub}>
          {timeLabel} • {dateLabel}
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statTitle}>Upcoming (Next 7 Days)</Text>
          </View>
          <View style={styles.statNumberRow}>
            <Clock size={18} color="#6366F1" />
            <Text style={[styles.statNumber, { color: "#111827" }]}>
              {upcomingCount}
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statTitle}>Overdue</Text>
          </View>
          <View style={styles.statNumberRow}>
            <Clock size={18} color="#EF4444" />
            <Text style={[styles.statNumber, { color: "#111827" }]}>
              {overdueCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Today’s Assignments Card */}
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Today’s Assignments</Text>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 12, marginBottom: 8 }}
        >
          <FilterChip
            label="All"
            active={selectedCourse === "All"}
            onPress={() => setSelectedCourse("All")}
          />
          {courses.map((course) => (
            <FilterChip
              key={course}
              label={course}
              active={selectedCourse === course}
              onPress={() => setSelectedCourse(course)}
            />
          ))}
        </ScrollView>

        {/* Today list / empty state */}
        {assignmentsToday.length === 0 ? (
          <Text style={styles.emptyToday}>No assignments due today 🎉</Text>
        ) : (
          assignmentsToday.map((a) => (
            <View key={a.id} style={styles.assignmentRow}>
              <Text style={styles.assignmentTitle}>{a.title}</Text>
              <Text style={styles.assignmentCourse}>{a.course}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function FilterChip({
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
      activeOpacity={0.9}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
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

  // stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statHeaderRow: {
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  statNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
  },

  // today's assignments card
  todayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  chipText: {
    fontWeight: "600",
    color: "#111827",
    fontSize: 14,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  emptyToday: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 14,
  },

  assignmentRow: {
    marginTop: 10,
  },
  assignmentTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  assignmentCourse: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 2,
  },
});
