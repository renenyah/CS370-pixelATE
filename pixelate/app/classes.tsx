// app/classes.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import {
  Folder,
  ChevronRight,
  X,
} from "lucide-react-native";
import {
  useAssignments,
  isOverdue,
  within7Days,
} from "../components/AssignmentsContext";

export default function ClassesScreen() {
  const { assignments } = useAssignments();
  const [openCourse, setOpenCourse] = useState<string | null>(
    null
  );

  const courses = useMemo(() => {
    const s = new Set<string>();
    assignments.forEach((a) => a.course && s.add(a.course));
    return Array.from(s);
  }, [assignments]);

  const itemsByCourse = useMemo(() => {
    const map: Record<string, typeof assignments> = {};
    assignments.forEach((a) => {
      if (!a.course) return;
      if (!map[a.course]) map[a.course] = [];
      map[a.course].push(a);
    });
    return map;
  }, [assignments]);

  const openItems = openCourse
    ? (itemsByCourse[openCourse] || []).slice().sort(
        (a, b) =>
          (a.dueISO || "").localeCompare(b.dueISO || "")
      )
    : [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Classes</Text>
          <Text style={styles.sub}>
            View all assignments grouped by class
          </Text>
        </View>

        {courses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No classes yet. Upload a syllabus to get started.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {courses.map((course) => {
              const items = itemsByCourse[course] || [];
              const overdueCount = items.filter((a) =>
                isOverdue(a.dueISO || null)
              ).length;
              const upcomingCount = items.filter((a) =>
                within7Days(a.dueISO || null)
              ).length;
              return (
                <TouchableOpacity
                  key={course}
                  style={styles.classCard}
                  activeOpacity={0.9}
                  onPress={() => setOpenCourse(course)}
                >
                  <View style={styles.classTop}>
                    <Folder
                      size={24}
                      color="#6D28D9"
                    />
                    <Text
                      numberOfLines={1}
                      style={styles.className}
                    >
                      {course}
                    </Text>
                  </View>

                  <View style={styles.pillsRow}>
                    <View
                      style={[
                        styles.pill,
                        styles.pillOverdue,
                      ]}
                    >
                      <Text style={styles.pillText}>
                        Overdue: {overdueCount}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        styles.pillUpcoming,
                      ]}
                    >
                      <Text style={styles.pillText}>
                        Upcoming: {upcomingCount}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={styles.viewText}>
                      View assignments
                    </Text>
                    <ChevronRight
                      size={18}
                      color="#6D28D9"
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Class detail modal */}
      <Modal
        visible={!!openCourse}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {openCourse}
              </Text>
              <TouchableOpacity
                onPress={() => setOpenCourse(null)}
              >
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: "80%" }}
              contentContainerStyle={{
                paddingVertical: 6,
              }}
            >
              {openItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    No assignments yet for this class.
                  </Text>
                </View>
              ) : (
                openItems.map((a) => {
                  const dueLabel = a.dueISO
                    ? new Date(
                        a.dueISO
                      ).toLocaleDateString()
                    : null;
                  let dotColor = "#10B981";
                  if (a.priority === "high")
                    dotColor = "#EF4444";
                  else if (a.priority === "medium")
                    dotColor = "#F59E0B";

                  return (
                    <View
                      key={a.id}
                      style={styles.assignmentRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignmentTitle}>
                          {a.title}
                        </Text>
                        {!!dueLabel && (
                          <Text
                            style={styles.assignmentMeta}
                          >
                            Due {dueLabel}
                          </Text>
                        )}
                        {!!a.type && (
                          <Text
                            style={styles.assignmentType}
                          >
                            {a.type}
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: dotColor },
                        ]}
                      />
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
  },
  classCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  classTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  className: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillOverdue: {
    backgroundColor: "#FDE8E8",
  },
  pillUpcoming: {
    backgroundColor: "#EDE9FE",
  },
  pillText: {
    fontWeight: "700",
    color: "#111827",
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewText: {
    color: "#6D28D9",
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  assignmentRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  assignmentTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  assignmentMeta: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 12,
  },
  assignmentType: {
    color: "#6D28D9",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
