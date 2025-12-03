// components/PlusMenu.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  X,
  FileText,
  FolderPlus,
  PlusCircle,
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
    <View style={styles.overlay}>
      {/* tap outside to close */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Quick actions</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <MenuItem
          icon={
            <View style={styles.iconCircle}>
              <FileText size={18} color="#fff" />
            </View>
          }
          label="Upload syllabus"
          description="Scan a PDF or image for assignments."
          onPress={() => {
            onClose();
            onUploadSyllabus();
          }}
        />

        <MenuItem
          icon={
            <View style={[styles.iconCircle, { backgroundColor: "#F97316" }]}>
              <FolderPlus size={18} color="#fff" />
            </View>
          }
          label="Add class folder"
          description="Create a new course folder."
          onPress={() => {
            onClose();
            onAddClass();
          }}
        />

        <MenuItem
          icon={
            <View style={[styles.iconCircle, { backgroundColor: "#10B981" }]}>
              <PlusCircle size={18} color="#fff" />
            </View>
          }
          label="Add assignment"
          description="Add one or more assignments (with or without an image)."
          onPress={() => {
            onClose();
            onAddAssignment();
          }}
        />
      </View>
    </View>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress: () => void;
};

function MenuItem({
  icon,
  label,
  description,
  onPress,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.itemRow}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{label}</Text>
        {!!description && (
          <Text style={styles.itemDesc}>{description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 96, // leaves room above bottom nav
  },
  sheet: {
    width: "80%",
    maxWidth: 360,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
