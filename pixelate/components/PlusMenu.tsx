// components/PlusMenu.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  FileText,
  FolderPlus,
  ListPlus,
} from "lucide-react-native";
import { colors } from "../constant/colors";

type Props = {
  onClose: () => void;
  onUploadSyllabus: () => void;
  onAddClass: () => void;
  onAddAssignment: () => void;
};

export default function PlusMenu({
  onClose,
  onUploadSyllabus,
  onAddClass,
  onAddAssignment,
}: Props) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      {/* dimmed background */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* small panel sitting above the plus button */}
      <View style={styles.sheet}>
        <MenuItem
          icon={
            <FileText
              size={18}
              color={colors.textPrimary}
            />
          }
          label="Upload syllabus"
          onPress={onUploadSyllabus}
        />
        <MenuItem
          icon={
            <FolderPlus
              size={18}
              color={colors.textPrimary}
            />
          }
          label="Add class"
          onPress={onAddClass}
        />
        <MenuItem
          icon={
            <ListPlus
              size={18}
              color={colors.textPrimary}
            />
          }
          label="Add assignment"
          onPress={onAddAssignment}
        />
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 96, // just above bottom nav + plus button
    left: 0,
    right: 0,
    alignItems: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  iconWrap: {
    marginRight: 8,
  },
  label: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 14,
  },
});
