// components/PlusMenu.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import {
  FileText,
  FolderPlus,
  PlusCircle,
  X,
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
    <Modal
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dim background */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Stop touch from propagating when pressing inside card */}
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header row */}
              <View style={styles.headerRow}>
                <Text style={styles.title}>Quick actions</Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                Choose how you want to add your assignments.
              </Text>

              {/* Options */}
              <View style={styles.options}>
                <MenuItem
                  icon={
                    <FileText
                      size={20}
                      color={colors.lavender}
                    />
                  }
                  label="Upload syllabus"
                  description="Parse a PDF or image to auto-add assignments."
                  onPress={() => {
                    onClose();
                    onUploadSyllabus();
                  }}
                />

                <MenuItem
                  icon={
                    <FolderPlus
                      size={20}
                      color={colors.blue}
                    />
                  }
                  label="Add class folder"
                  description="Create a new class and color folder."
                  onPress={() => {
                    onClose();
                    onAddClass();
                  }}
                />

                <MenuItem
                  icon={
                    <PlusCircle
                      size={20}
                      color={colors.pink}
                    />
                  }
                  label="Add assignment"
                  description="Add a single assignment or from an image."
                  onPress={() => {
                    onClose();
                    onAddAssignment();
                  }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

type MenuItemProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
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
      style={styles.item}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  options: {
    marginTop: 4,
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  itemDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
