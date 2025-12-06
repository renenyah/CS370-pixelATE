import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { colors } from "../constant/colors";
import { useAssignments } from "./AssignmentsContext";

type AddClassModalProps = {
  visible: boolean;
  onClose: () => void;

  // ✅ Optional props so this modal can also be used for editing
  mode?: "add" | "edit";
  initialName?: string;
  initialSemester?: string;
  initialYear?: number;
  initialColor?: string;
  /** Name of the class before editing, used as oldName in updateClassFolder */
  originalName?: string;
};

const colorOptions = ["#7C3AED", "#2563EB", "#059669", "#DC2626", "#F59E0B"];

export default function AddClassModal({
  visible,
  onClose,
  mode = "add",
  initialName,
  initialSemester,
  initialYear,
  initialColor,
  originalName,
}: AddClassModalProps) {
  const { addClassFolder, updateClassFolder } = useAssignments();

  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  const isEdit = mode === "edit";

  // When opening in edit mode, pre-fill fields from props
  useEffect(() => {
    if (!visible) return;

    if (isEdit) {
      setName(initialName ?? "");
      setSemester(initialSemester ?? "");
      setYear(initialYear ?? null);

      if (initialColor && colorOptions.includes(initialColor)) {
        setSelectedColor(initialColor);
      } else if (initialColor) {
        setSelectedColor(initialColor);
      } else {
        setSelectedColor(colorOptions[0]);
      }
    } else {
      // add mode: reset to blank when opened
      setName("");
      setSemester("");
      setYear(null);
      setSelectedColor(colorOptions[0]);
    }
  }, [visible, isEdit, initialName, initialSemester, initialYear, initialColor]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedSemester = semester.trim();
    const numericYear = year && !Number.isNaN(year) ? year : undefined;

    if (!trimmedName) return;

    if (isEdit) {
      // ✅ Update existing folder + its assignments (handled in context)
      const oldName = originalName || initialName || trimmedName;
      updateClassFolder({
        oldName,
        newName: trimmedName,
        semester: trimmedSemester || undefined,
        year: numericYear,
      });
    } else {
      // ✅ Add new class folder
      addClassFolder({
        name: trimmedName,
        color: selectedColor,
        semester: trimmedSemester || undefined,
        year: numericYear,
      });
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {isEdit ? "Edit Class Folder" : "Add Class Folder"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Class name (e.g. CS 334)"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Semester (e.g. Fall)"
            placeholderTextColor="#9CA3AF"
            value={semester}
            onChangeText={setSemester}
          />

          <TextInput
            style={styles.input}
            placeholder="Year (e.g. 2025)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            value={year ? String(year) : ""}
            onChangeText={(t) => {
              const n = Number(t);
              if (Number.isNaN(n)) {
                setYear(null);
              } else {
                setYear(n);
              }
            }}
          />

          <Text style={styles.label}>Choose color:</Text>
          <View style={styles.colorRow}>
            {colorOptions.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.9}
          >
            <Text style={styles.saveText}>
              {isEdit ? "Save Changes" : "Add Class"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "88%",
    backgroundColor: "#0B1220",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  title: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F9FAFB",
    fontSize: 14,
    marginBottom: 10,
  },
  label: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: colors.lavender,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cancel: {
    marginTop: 10,
    alignSelf: "center",
  },
  cancelText: {
    color: "#9CA3AF",
  },
});
