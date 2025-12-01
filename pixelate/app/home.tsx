// app/home.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useAssignments,
  todayISO,
  isSameISO,
  within7Days,
  isOverdue,
} from "../components/AssignmentsContext";

export default function HomeScreen() {
  const { assignments } = useAssignments();
  const [now, setNow] = useState(new Date());
  const [todayCourse, setTodayCourse] = useState<string | "All">("All");

  // Read `showTour` query param: /home?showTour=1
  const params = useLocalSearchParams<{ showTour?: string }>();
  const [showTour, setShowTour] = useState(params.showTour === "1");
  const [tourStep, setTourStep] = useState(0);

  const tourSteps = [
    {
      key: "home",
      title: "Home",
      description:
        "See what’s due today, what’s coming up this week, and anything overdue.",
    },
    {
      key: "classes",
      title: "Classes",
      description:
        "Tap the Classes tab to open a folder view of each course and all its assignments.",
    },
    {
      key: "plus",
      title: "+ menu",
      description:
        "Use the big + button to upload a syllabus, add a class, or add a single assignment.",
    },
    {
      key: "calendar",
      title: "Calendar",
      description:
        "The Calendar tab shows your assignments on a monthly, weekly, or daily calendar.",
    },
    {
      key: "profile",
      title: "Profile",
      description:
        "Update your basic info in Profile. Later this will connect to Supabase auth.",
    },
  ];

  const handleSkipTour = () => setShowTour(false);
  const handleNextTour = () => {
    if (tourStep >= tourSteps.length - 1) {
      setShowTour(false);
    } else {
      setTourStep((i) => i + 1);
    }
  };

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

  const courses = useMemo(() => {
    const s = new Set<string>();
    assignments.forEach((a) => {
      if (a.course) s.add(a.course);
    });
    return Array.from(s);
  }, [assignments]);

  const dueTodayAll = useMemo(
    () =>
      assignments.filter((a) =>
        isSameISO(a.dueISO || null, todayISO)
      ),
    [assignments]
  );

  const dueToday = useMemo(() => {
    if (todayCourse === "All") return dueTodayAll;
    return dueTodayAll.filter((a) => a.course === todayCourse);
  }, [dueTodayAll, todayCourse]);

  const upcoming7 = useMemo(
    () =>
      assignments.filter((a) =>
        within7Days(a.dueISO || null)
      ),
    [assignments]
  );

  const overdue = useMemo(
    () =>
      assignments.filter((a) =>
        isOverdue(a.dueISO || null)
      ),
    [assignments]
  );

  return (
    <View style={styles.screen}>
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Clock size={20} color="#4F46E5" />
            </View>
            <Text style={styles.statTitle}>
              Upcoming (Next 7 Days)
            </Text>
            <Text
              style={[
                styles.statNumber,
                { color: "#4F46E5" },
              ]}
            >
              {upcoming7.length}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <AlertCircle size={20} color="#DC2626" />
            </View>
            <Text style={styles.statTitle}>Overdue</Text>
            <Text
              style={[
                styles.statNumber,
                { color: "#DC2626" },
              ]}
            >
              {overdue.length}
            </Text>
          </View>
        </View>

        {/* Today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today’s Assignments</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            <Chip
              label="All"
              active={todayCourse === "All"}
              onPress={() => setTodayCourse("All")}
            />
            {courses.map((c) => (
              <Chip
                key={c}
                label={c}
                active={todayCourse === c}
                onPress={() => setTodayCourse(c)}
              />
            ))}
          </ScrollView>

          {dueToday.length === 0 ? (
            <EmptyCard text="No assignments due today 🎉" />
          ) : (
            <View style={{ gap: 10 }}>
              {dueToday.map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </View>
          )}
        </View>

        {/* Upcoming section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <Text style={styles.sectionSub}>Next 7 days</Text>
          </View>

          {upcoming7.length === 0 ? (
            <EmptyCard text="Nothing coming up this week." />
          ) : (
            <View style={{ gap: 10 }}>
              {upcoming7
                .slice()
                .sort((a, b) =>
                  (a.dueISO || "").localeCompare(b.dueISO || "")
                )
                .map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
            </View>
          )}
        </View>

        {/* Overdue section */}
        {overdue.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Overdue</Text>
              <View style={styles.badgeDanger}>
                <Text style={styles.badgeDangerText}>
                  Needs attention
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {overdue
                .slice()
                .sort((a, b) =>
                  (a.dueISO || "").localeCompare(b.dueISO || "")
                )
                .map((a) => (
                  <AssignmentCard key={a.id} assignment={a} />
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Walkthrough overlay */}
      {showTour && (
        <View style={styles.tourOverlay}>
          <View style={styles.tourCard}>
            <Text style={styles.tourTitle}>Quick tour</Text>
            <Text style={styles.tourStepLabel}>
              Step {tourStep + 1} of {tourSteps.length}
            </Text>
            <Text style={styles.tourItemTitle}>
              {tourSteps[tourStep].title}
            </Text>
            <Text style={styles.tourItemDesc}>
              {tourSteps[tourStep].description}
            </Text>

            <View style={styles.tourButtonsRow}>
              <TouchableOpacity
                style={styles.tourSecondaryButton}
                onPress={handleSkipTour}
              >
                <Text style={styles.tourSecondaryText}>
                  Skip tour
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tourPrimaryButton}
                onPress={handleNextTour}
              >
                <Text style={styles.tourPrimaryText}>
                  {tourStep === tourSteps.length - 1
                    ? "Finish"
                    : "Next"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ marginRight: 8 }}>
      <Text
        onPress={onPress}
        style={[styles.chip, active && styles.chipActive]}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function AssignmentCard({ assignment }: { assignment: any }) {
  const dueLabel = assignment.dueISO
    ? new Date(assignment.dueISO).toLocaleDateString()
    : null;

  let dotColor = "#10B981";
  if (assignment.priority === "high") dotColor = "#EF4444";
  else if (assignment.priority === "medium") dotColor = "#F59E0B";

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{assignment.title}</Text>
        {!!assignment.course && (
          <Text style={styles.cardCourse}>{assignment.course}</Text>
        )}
        {!!dueLabel && (
          <Text style={styles.cardMeta}>Due {dueLabel}</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <ArrowRight size={18} color="#9CA3AF" />
      </View>
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
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  statIconWrap: {
    backgroundColor: "#E0E7FF",
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statTitle: {
    color: "#111827",
    fontWeight: "600",
    marginBottom: 6,
    fontSize: 13,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionSub: {
    color: "#6B7280",
    fontSize: 13,
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDangerText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 11,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
  },
  chipActive: {
    backgroundColor: "#7C3AED",
    color: "#FFFFFF",
    borderColor: "#7C3AED",
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
    gap: 10,
  },
  cardTitle: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 15,
  },
  cardCourse: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 13,
  },
  cardMeta: {
    color: "#6D28D9",
    marginTop: 2,
    fontWeight: "600",
    fontSize: 12,
  },
  cardRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Walkthrough styles
  tourOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 110, // leave room for bottom nav
  },
  tourCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  tourStepLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  tourItemTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#4F46E5",
  },
  tourItemDesc: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
  },
  tourButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  tourSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tourSecondaryText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  tourPrimaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#A2D2FF",
  },
  tourPrimaryText: {
    color: "#111827",
    fontWeight: "700",
  },
});
