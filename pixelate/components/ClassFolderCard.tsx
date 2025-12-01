// components/ClassFolderCard.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Folder as FolderIcon, ChevronRight } from "lucide-react-native";
import { colors } from "../constant/colors";

type Props = {
  course: string;
  semesterLabel?: string;
  folderColor?: string;
  overdueCount: number;
  upcomingCount: number;
  onPress?: () => void;
  onEditClass?: () => void;
};

export default function ClassFolderCard({
  course,
  semesterLabel,
  folderColor,
  overdueCount,
  upcomingCount,
  onPress,
  onEditClass,
}: Props) {
  const color = folderColor || colors.lavender;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.wrapper}
    >
      <View
        style={[styles.sideBar, { backgroundColor: color }]}
      />

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={styles.iconCircle}>
              <FolderIcon
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseText} numberOfLines={1}>
                {course}
              </Text>
              {!!semesterLabel && (
                <Text style={styles.semesterText}>
                  {semesterLabel}
                </Text>
              )}
            </View>
          </View>

          {onEditClass && (
            <TouchableOpacity
              onPress={onEditClass}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badgeOverdue}>
            <Text style={styles.badgeLabel}>
              Overdue: {overdueCount}
            </Text>
          </View>
          <View style={styles.badgeUpcoming}>
            <Text style={styles.badgeLabel}>
              Upcoming: {upcomingCount}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.viewText}>View</Text>
          <ChevronRight size={18} color={colors.lavender} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
  },
  sideBar: {
    width: 12,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  courseText: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  semesterText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editText: {
    fontSize: 13,
    color: colors.lavender,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  badgeOverdue: {
    backgroundColor: "#FFE4E6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeUpcoming: {
    backgroundColor: "#EDE9FE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewText: {
    fontSize: 13,
    color: colors.lavender,
    fontWeight: "700",
  },
});
