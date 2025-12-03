// components/AddClassModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { X } from "lucide-react-native";

import { useAssignments } from "./AssignmentsContext";
import { colors } from "../constant/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

const CLASS_COLORS = [
  colors.lavender,
  colors.pink,
  colors.blueLight,
  colors.blue,
  "#FDE68A",
];

export default function AddClassModal({
  visible,
  onClose,
}: Props) {
  const { addClassFolder } = useAssignments();

  const [name, setName] = useState("");
  const [semester, setSemester] = useState<string | undefined>(
    undefined
  );
  const [year, setYear] = useState<string>("2025");
  const [folderColor, setFolderColor] = useState<string>(
    colors.lavender
  );

  const reset = () => {
    setName("");
    setSemester(undefined);
    setYear("2025");
    setFolderColor(colors.lavender);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const numericYear = Number(year);
    addClassFolder({
      name: trimmed,
      color: folderColor,
      semester,
      year: isNaN(numericYear) ? undefined : numericYear,
    });
    closeAll();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeAll}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add Class</Text>
            <TouchableOpacity onPress={closeAll}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Create a folder for one of your classes. You can
            connect assignments to it later.
          </Text>

          <Text style={styles.label}>Class name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., CS 370 – Algorithms"
            placeholderTextColor={
              colors.textSecondary + "99"
            }
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.label}>Semester</Text>
              <View style={styles.chipRow}>
                {SEMESTERS.map((s) => {
                  const active = semester === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        active && styles.chipActive,
                      ]}
                      onPress={() =>
                        setSemester(
                          active ? undefined : s
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active &&
                            styles.chipTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ width: 90 }}>
              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                placeholder="2025"
                placeholderTextColor={
                  colors.textSecondary + "99"
                }
                keyboardType="numeric"
                value={year}
                onChangeText={setYear}
              />
            </View>
          </View>

          <Text style={styles.label}>Folder color</Text>
          <View style={styles.colorRow}>
            {CLASS_COLORS.map((c, idx) => {
              const active = folderColor === c;
              return (
                <TouchableOpacity
                  key={`${c}-${idx}`}
                  onPress={() => setFolderColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    active && styles.colorDotActive,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={closeAll}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.primaryBtn,
              ]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.primaryText}>
                Save class
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  sub: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 10,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.chipBackground,
  },
  chipActive: {
    backgroundColor: colors.chipActiveBackground,
  },
  chipText: {
    color: colors.chipText,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.chipTextActive,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: {
    borderColor: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  primaryBtn: {
    backgroundColor: colors.blue,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },
});
