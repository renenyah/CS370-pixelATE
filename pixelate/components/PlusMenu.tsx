// components/PlusMenu.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  Upload,
  Folder as FolderIcon,
  FileText,
} from "lucide-react-native";

import UploadSyllabusModal from "./UploadSyllabusModal";
import { colors } from "../constant/colors";

type Props = {
  onClose: () => void;
  onUploadSyllabus: () => void;
  onAddClass: () => void;
  onAddAssignment: () => void;
};

export default function PlusMenu({ onClose }: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);

  const openUpload = () => {
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    onClose();
  };

  return (
    <>
      {/* dimmed background */}
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* floating card just above the + button */}
        <View style={styles.menuCard}>
          <MenuItem
            icon={<Upload size={18} color={colors.textPrimary} />}
            label="Upload Syllabus"
            onPress={openUpload}
          />
          <MenuItem
            icon={<FolderIcon size={18} color={colors.textPrimary} />}
            label="Add Class"
            onPress={() => {
              // TODO: show “add class” flow
              onClose();
            }}
          />
          <MenuItem
            icon={<FileText size={18} color={colors.textPrimary} />}
            label="Add Assignment"
            onPress={() => {
              // TODO: show “add assignment” flow
              onClose();
            }}
          />
        </View>
      </View>

      {/* syllabus upload flow */}
      <UploadSyllabusModal
        visible={uploadOpen}
        onClose={closeUpload}
      />
    </>
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
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
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
    justifyContent: "flex-end",
    alignItems: "center",
  },
  // sits just above the bottom nav + button
  menuCard: {
    marginBottom: 110, // roughly nav height + a little gap
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    width: 260,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  menuLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
