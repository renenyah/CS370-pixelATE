import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type ViewMode = "month" | "week" | "day";

type CalendarViewProps = {
  view: ViewMode;
  setView: (v: ViewMode) => void;
};

export default function CalendarView({ view, setView }: CalendarViewProps) {
  const options: ViewMode[] = ["month", "week", "day"];

  return (
    <View style={styles.wrapper}>
      <View style={styles.toggle}>
        {options.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.option, view === v && styles.active]}
            onPress={() => setView(v)}
          >
            <Text
              style={[
                styles.optionText,
                view === v && styles.optionTextActive,
              ]}
            >
              {v.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.placeholder}>
        <Text style={styles.text}>
          {view === "month" && "📆 Month view placeholder"}
          {view === "week" && "🗓️ Week view placeholder"}
          {view === "day" && "☀️ Day view placeholder"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: 20 },
  toggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  option: { backgroundColor: "#E5E7EB", borderRadius: 10, padding: 8 },
  active: { backgroundColor: "#EDE9FE" },
  optionText: { fontWeight: "700" },
  optionTextActive: { color: "#6D28D9" },
  placeholder: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
  },
  text: { color: "#6B7280", fontWeight: "600" },
});
