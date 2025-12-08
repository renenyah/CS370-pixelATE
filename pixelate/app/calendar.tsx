// app/calendar.tsx
import React, {
  useEffect,
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
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import {
  useAssignments,
  isSameISO,
} from "../components/AssignmentsContext";
import { colors } from "@/constant/colors";

type ViewMode = "month" | "week" | "day";

const weekdayLabels = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// --- helpers for week calculations ----
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return new Date(y, m - 1, d);
}

function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Given a center date (selected day), return the Sunday–Saturday
 * ISO range that week.
 */
function getWeekBounds(centerISO: string) {
  const base = isoToDate(centerISO);
  const day = base.getDay(); // 0 = Sun ... 6 = Sat

  const start = new Date(base);
  start.setDate(base.getDate() - day);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startISO: dateToISO(start),
    endISO: dateToISO(end),
    startDate: start,
    endDate: end,
  };
}

export default function CalendarScreen() {
  const { assignments } = useAssignments();

  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedISO, setSelectedISO] =
    useState<string>(todayISO());

  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date()),
      60 * 1000
    );
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

  const monthLabel = useMemo(
    () =>
      cursor.toLocaleDateString([], {
        month: "long",
        year: "numeric",
      }),
    [cursor]
  );

  const monthGrid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0–6
    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const cells: (string | null)[] = [];

    for (let i = 0; i < startDay; i++) cells.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = d.toISOString().slice(0, 10);
      cells.push(iso);
    }

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const selectedDateLabel = useMemo(
    () =>
      new Date(
        selectedISO
      ).toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [selectedISO]
  );

  const dayAssignments = useMemo(
    () =>
      assignments.filter((a) =>
        isSameISO(a.dueISO || null, selectedISO)
      ),
    [assignments, selectedISO]
  );

  // --- Week view data: assignments in the same week as selectedISO ---
  const {
    startISO,
    endISO,
    startDate: weekStartDate,
    endDate: weekEndDate,
  } = useMemo(
    () => getWeekBounds(selectedISO),
    [selectedISO]
  );

  const weekRangeLabel = useMemo(
    () =>
      `${weekStartDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })} – ${weekEndDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })}`,
    [weekStartDate, weekEndDate]
  );

  const weekAssignments = useMemo(
    () =>
      assignments
        .filter((a) => {
          const iso = a.dueISO;
          if (!iso) return false;
          // 'YYYY-MM-DD' string compare works because it's chronological
          return iso >= startISO && iso <= endISO;
        })
        .sort((a, b) =>
          (a.dueISO || "").localeCompare(b.dueISO || "")
        ),
    [assignments, startISO, endISO]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Calendar 🗓️</Text>
        <Text style={styles.sub}>
          {timeLabel} • {dateLabel}
        </Text>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggleRow}>
        <ViewToggleChip
          label="Month"
          active={view === "month"}
          onPress={() => setView("month")}
        />
        <ViewToggleChip
          label="Week"
          active={view === "week"}
          onPress={() => setView("week")}
        />
        <ViewToggleChip
          label="Day"
          active={view === "day"}
          onPress={() => setView("day")}
        />
      </View>

      {/* MONTH VIEW */}
      {view === "month" && (
        <>
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                const d = new Date(cursor);
                d.setMonth(d.getMonth() - 1);
                setCursor(d);
              }}
            >
              <ChevronLeft
                size={18}
                color="#7C3AED"
              />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {monthLabel}
            </Text>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                const d = new Date(cursor);
                d.setMonth(d.getMonth() + 1);
                setCursor(d);
              }}
            >
              <ChevronRight
                size={18}
                color="#7C3AED"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {weekdayLabels.map((w) => (
              <Text
                key={w}
                style={styles.weekdayText}
              >
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {monthGrid.map((iso, idx) => {
              if (!iso) {
                return (
                  <View
                    key={`blank-${idx}`}
                    style={styles.cell}
                  />
                );
              }

              const dayNum = Number(iso.slice(-2));
              const isSelected = iso === selectedISO;
              const hasAssignments =
                assignments.filter((a) =>
                  isSameISO(a.dueISO || null, iso)
                ).length > 0;

              return (
                <TouchableOpacity
                  key={iso}
                  style={styles.cell}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedISO(iso);
                    setView("day");
                  }}
                >
                  <View
                    style={[
                      styles.dayCard,
                      isSelected &&
                        styles.dayCardSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected &&
                          styles.dayTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {hasAssignments && (
                      <View style={styles.dayDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* WEEK VIEW – now real data, same general UI */}
      {view === "week" && (
        <View style={styles.dayBox}>
          <Text style={styles.dayTitle}>
            Week of {weekRangeLabel}
          </Text>
          {weekAssignments.length === 0 ? (
            <Text style={styles.dayEmpty}>
              No assignments due this week.
            </Text>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {weekAssignments.map((a) => (
                <View key={a.id} style={styles.taskCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>
                      {a.title}
                    </Text>
                    {!!a.course && (
                      <Text style={styles.taskCourse}>
                        {a.course}
                      </Text>
                    )}
                    {!!a.type && (
                      <Text style={styles.taskDate}>
                        {a.type}
                      </Text>
                    )}
                    {!!a.dueISO && (
                      <Text style={styles.taskType}>
                        Due{" "}
                        {new Date(
                          a.dueISO
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <View style={styles.dayBox}>
          <Text style={styles.dayTitle}>
            {selectedDateLabel}
          </Text>
          {dayAssignments.length === 0 ? (
            <Text style={styles.dayEmpty}>
              No assignments due on this day.
            </Text>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {dayAssignments.map((a) => (
                <View
                  key={a.id}
                  style={styles.taskCard}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>
                      {a.title}
                    </Text>
                    {!!a.course && (
                      <Text
                        style={styles.taskCourse}
                      >
                        {a.course}
                      </Text>
                    )}
                    {!!a.type && (
                      <Text style={styles.taskType}>
                        {a.type}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function ViewToggleChip({
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
      style={[
        styles.viewChip,
        active && styles.viewChipActive,
      ]}
    >
      <Text
        style={[
          styles.viewChipText,
          active && styles.viewChipTextActive,
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
  viewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  viewChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  viewChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  viewChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  viewChipTextActive: {
    color: "#FFFFFF",
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  dayCard: {
    width: "86%",
    height: "86%",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCardSelected: {
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  dayTextSelected: {
    color: "#7C3AED",
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7C3AED",
    position: "absolute",
    bottom: 6,
    right: 6,
  },
  placeholderBox: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  placeholderText: {
    color: "#6B7280",
    fontSize: 14,
  },
  highlight: {
    marginTop: 6,
    fontWeight: "700",
    color: "#7C3AED",
    fontSize: 16,
  },
  dayBox: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  dayEmpty: {
    marginTop: 8,
    color: "#6B7280",
  },
  taskCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
  },
  taskTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  taskCourse: {
    color: "#6B7280",
    marginTop: 2,
    fontSize: 13,
  },
  taskType: {
    color: "#6D28D9",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  taskDate: {
    color: colors.lavender,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
});
