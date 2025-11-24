// app/calendar.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

type ViewMode = "month" | "week" | "day";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CalendarScreen() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());

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
    const month = cursor.getMonth(); // 0-based
    const first = new Date(year, month, 1);
    const startDay = first.getDay(); // 0–6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (string | null)[] = [];

    // leading blanks
    for (let i = 0; i < startDay; i++) cells.push(null);

    // all days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = d.toISOString().slice(0, 10);
      cells.push(iso);
    }

    // trailing blanks to complete rows of 7
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [cursor]);

  const selectedDateLabel = useMemo(
    () =>
      new Date(selectedISO).toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [selectedISO]
  );

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
          {/* Month header row */}
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                const d = new Date(cursor);
                d.setMonth(d.getMonth() - 1);
                setCursor(d);
              }}
            >
              <ChevronLeft size={18} color="#7C3AED" />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>{monthLabel}</Text>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                const d = new Date(cursor);
                d.setMonth(d.getMonth() + 1);
                setCursor(d);
              }}
            >
              <ChevronRight size={18} color="#7C3AED" />
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {weekdayLabels.map((w) => (
              <Text key={w} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {monthGrid.map((iso, idx) => {
              if (!iso) {
                return <View key={`blank-${idx}`} style={styles.cell} />;
              }

              const day = Number(iso.slice(-2));
              const isSelected = iso === selectedISO;

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
                      isSelected && styles.dayCardSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* WEEK VIEW – simple placeholder using selected date's week */}
      {view === "week" && (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderTitle}>Week View</Text>
          <Text style={styles.placeholderText}>
            Week view will show assignments grouped by day. For now this is a
            placeholder with the selected date:
          </Text>
          <Text style={styles.highlight}>{selectedDateLabel}</Text>
        </View>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderTitle}>Assignments for</Text>
          <Text style={[styles.highlight, { marginBottom: 10 }]}>
            {selectedDateLabel}
          </Text>
          <Text style={styles.placeholderText}>
            No assignments yet for this day. In the future you’ll see a list of
            assignments due here.
          </Text>
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
      style={[styles.viewChip, active && styles.viewChipActive]}
    >
      <Text
        style={[styles.viewChipText, active && styles.viewChipTextActive]}
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
});
