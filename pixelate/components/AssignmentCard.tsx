import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AssignmentCard({ title, dueDate, course }: any) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.course}>{course}</Text>
        <Text style={styles.date}>Due: {dueDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  title: { fontWeight: "700", fontSize: 16 },
  course: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  date: { color: "#7C3AED", fontWeight: "600", marginTop: 4 },
});
