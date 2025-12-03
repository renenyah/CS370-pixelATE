// app/classes/[course].tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  useAssignments,
} from "../../components/AssignmentsContext";

export default function ClassDetailScreen() {
  const { assignments } = useAssignments();
  const params =
    useLocalSearchParams<{ course?: string }>();
  const courseName = params.course || "";

  const items = useMemo(
    () =>
      assignments
        .filter((a) => a.course === courseName)
        .sort((a, b) =>
          (a.dueISO || "").localeCompare(
            b.dueISO || ""
          )
        ),
    [assignments, courseName]
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{courseName}</Text>
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
                <View
                  key={a.id}
                  style={styles.card}
                >
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
              );
            })}
          </View>
        )}
      </ScrollView>
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
});
