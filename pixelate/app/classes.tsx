// app/classes.tsx
import React, { useState } from "react";
import { ScrollView, Text, StyleSheet, View } from "react-native";
import ClassFolderCard from "../components/ClassFolderCard";

export default function ClassesScreen() {
  const [classes] = useState([
    { id: 1, name: "CS 370", overdue: 1, upcoming: 3 },
    { id: 2, name: "SPAN 340", overdue: 0, upcoming: 2 },
  ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>My Classes</Text>
      {classes.map((c) => (
        <ClassFolderCard key={c.id} course={c.name} overdueCount={c.overdue} upcomingCount={c.upcoming} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", paddingHorizontal: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 12 },
});
