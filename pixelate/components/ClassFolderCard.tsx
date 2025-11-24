import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Folder } from "lucide-react-native";

export default function ClassFolderCard({ course, overdueCount, upcomingCount }: any) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Folder size={24} color="#6D28D9" />
        <Text style={styles.course}>{course}</Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
          Overdue: {overdueCount}
        </Text>
        <Text style={[styles.badge, { backgroundColor: "#EDE9FE" }]}>
          Upcoming: {upcomingCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  course: { fontWeight: "800", fontSize: 16, color: "#111827" },
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontWeight: "700",
  },
});
