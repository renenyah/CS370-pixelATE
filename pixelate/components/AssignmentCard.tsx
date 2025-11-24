import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { format, isPast, isToday, isTomorrow } from "date-fns";

interface AssignmentCardProps {
  assignment: {
    id: string;
    title: string;
    course_name?: string;
    assignment_type?: string;
    due_date: string;
    description?: string;
    completed: boolean;
  };
  onToggleComplete: (id: string, completed: boolean) => void;
}

export default function AssignmentCard({ assignment, onToggleComplete }: AssignmentCardProps) {
  
  const dueDate = new Date(assignment.due_date);

  const isOverdue = isPast(dueDate) && !assignment.completed;
  const dueToday = isToday(dueDate);
  const dueTomorrow = isTomorrow(dueDate);

  const getDueLabel = () => {
    if(dueToday) return "Due Today";
    if(dueTomorrow) return "Due Tomorrow";
    if(isOverdue) return "Overdue";
    return format(dueDate, "MMM d, yyyy");
  }
  
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
