// components/AddAssignmentModal.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { X, Image as ImageIcon } from "lucide-react-native";

import {
  useAssignments,
  Draft,
  AssignmentType,
  safeISO,
} from "./AssignmentsContext";
import DraftEditorModal from "./DraftEditorModal";
import { colors } from "../constant/colors";
import { API_BASE } from "../constant/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialCourse?: string;
};

type DueItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  assignment_type?: string;
  page?: number | null;
  course?: string;
  source?: string;
};

type ApiResponse = {
  status?: "ok" | "error";
  message?: string;
  items?: DueItem[];
};

const TYPE_OPTIONS: AssignmentType[] = [
  "Assignment",
  "Quiz",
  "Test",
  "Project",
  "Discussion",
  "Reading",
  "Art",
  "Other",
];

function nextDraftId(): string {
  return `d_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AddAssignmentModal({
  visible,
  onClose,
  initialCourse,
}: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  // manual single-assignment form
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(initialCourse || "");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssignmentType>("Assignment");

  // date & time with default 11:59 pm
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const defaultTime = useMemo(() => {
    const t = new Date();
    t.setHours(23, 59, 0, 0); // 11:59pm
    return t;
  }, []);

  const [date, setDate] = useState<Date>(defaultDate);
  const [time, setTime] = useState<Date>(defaultTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // extracted from image → DraftEditorModal
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);

  const resetForm = () => {
    setTitle("");
    setCourse(initialCourse || "");
    setDescription("");
    setType("Assignment");
    setDate(defaultDate);
    setTime(defaultTime);
    setDrafts([]);
    setEditorVisible(false);
  };

  const closeAll = () => {
    resetForm();
    onClose();
  };

  const handleBackendError = (msg?: string) => {
    Alert.alert("Upload failed", msg || "Server error");
  };

  const combineDateTimeToString = (d: Date, t: Date): string => {
    const combined = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      t.getHours(),
      t.getMinutes(),
      0,
      0
    );
    const mm = (combined.getMonth() + 1).toString().padStart(2, "0");
    const dd = combined.getDate().toString().padStart(2, "0");
    const yyyy = combined.getFullYear();
    const hh = combined.getHours().toString().padStart(2, "0");
    const min = combined.getMinutes().toString().padStart(2, "0");
    // string that safeISO can parse
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  };

  const handleSaveManual = () => {
    const trimmedTitle = title.trim();
    const trimmedCourse = course.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please enter an assignment name.");
      return;
    }

    const dateTimeString = combineDateTimeToString(date, time);
    const iso = safeISO(dateTimeString);

    const draft: Draft = {
      id: nextDraftId(),
      title: trimmedTitle,
      course: trimmedCourse || "Untitled Course",
      type,
      dueISO: iso,
      description: description.trim() || "",
    };

    addAssignmentsFromDrafts([draft]);
    closeAll();
  };

  const mapTypeFromBackend = (raw?: string): AssignmentType => {
    if (!raw) return "Assignment";
    const lower = raw.toLowerCase();
    if (lower.includes("quiz")) return "Quiz";
    if (lower.includes("exam") || lower.includes("test") || lower.includes("midterm") || lower.includes("final"))
      return "Test";
    if (lower.includes("project")) return "Project";
    if (lower.includes("discussion")) return "Discussion";
    if (lower.includes("reading")) return "Reading";
    if (lower.includes("art")) return "Art";
    return "Assignment";
  };

  const makeDraftsFromItems = (items: DueItem[]) => {
    const ds: Draft[] = (items || []).map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      course: it.course || course || "Untitled Course",
      type: mapTypeFromBackend(it.assignment_type),
      dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
      description: "",
    }));

    if (!ds.length) {
      Alert.alert(
        "No assignments found",
        "The extractor didn't find any assignments in this image."
      );
      return;
    }

    setDrafts(ds);
    setEditorVisible(true); // open review popup
  };

  // ---------- IMAGE / OCR ----------
  const handlePickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (res.canceled || !res.assets?.[0]) return;

    const asset = res.assets[0] as any;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append(
        "file",
        {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || "image/jpeg",
        } as any
      );

      const base = API_BASE.replace(/\/$/, "");
      const url = `${base}/assignments/image?preprocess=${encodeURIComponent(
        "screenshot"
      )}&use_llm=true`;
      console.log("IMAGE (AddAssignmentModal) →", url);

      const resp = await fetch(url, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        console.log("Image resp not ok:", resp.status, resp.statusText);
        return handleBackendError(`HTTP ${resp.status} – ${resp.statusText}`);
      }

      let json: ApiResponse | any;
      try {
        json = (await resp.json()) as ApiResponse;
      } catch (e: any) {
        console.log("Image JSON parse error:", e);
        return handleBackendError("Could not parse server response.");
      }

      console.log(
        "Image resp (AddAssignmentModal) →",
        JSON.stringify(json)
      );

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      makeDraftsFromItems(items);
    } catch (e: any) {
      console.log("Image parse error:", e);
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setParsing(false);
    }
  };

  const formattedDate = useMemo(
    () =>
      date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [date]
  );

  const formattedTime = useMemo(
    () =>
      time.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    [time]
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Add Assignment</Text>
              <TouchableOpacity onPress={closeAll}>
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* ---------- TOP: Upload image first ---------- */}
              <Text style={styles.label}>Upload screenshot / photo</Text>
              <TouchableOpacity
                style={styles.fileBtn}
                onPress={handlePickImage}
                disabled={parsing}
              >
                <ImageIcon size={18} color={colors.textPrimary} />
                <Text style={styles.fileBtnText}>
                  {parsing ? "Parsing…" : "Choose image from gallery"}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or add manually</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ---------- Manual form ---------- */}
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Homework 3 – Dynamic Programming"
                placeholderTextColor={colors.textSecondary + "99"}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Class</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., CS 370 – Algorithms"
                placeholderTextColor={colors.textSecondary + "99"}
                value={course}
                onChangeText={setCourse}
              />

              <Text style={styles.label}>Assignment type</Text>
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      type === t && styles.typeChipActive,
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        type === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.label}>Due date</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {formattedDate}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.label}>Due time</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.pickerButtonText}>
                      {formattedTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(
                    _event: DateTimePickerEvent,
                    selected?: Date
                  ) => {
                    if (Platform.OS !== "ios") {
                      setShowDatePicker(false);
                    }
                    if (!selected) return;
                    setDate(selected);
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(
                    _event: DateTimePickerEvent,
                    selected?: Date
                  ) => {
                    if (Platform.OS !== "ios") {
                      setShowTimePicker(false);
                    }
                    if (!selected) return;
                    setTime(selected);
                  }}
                />
              )}

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Notes or details…"
                placeholderTextColor={colors.textSecondary + "99"}
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={closeAll}
                disabled={parsing}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={handleSaveManual}
                disabled={parsing}
              >
                <Text style={styles.primaryText}>Save assignment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Separate editor popup for extracted assignments */}
      <DraftEditorModal
        visible={editorVisible}
        initialDrafts={drafts}
        onClose={() => setEditorVisible(false)}
        onSave={(cleanedDrafts) => {
          addAssignmentsFromDrafts(
            cleanedDrafts.map((d) => ({
              ...d,
              dueISO: safeISO(d.dueISO || null),
            }))
          );
          setEditorVisible(false);
          closeAll();
        }}
      />
    </>
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
  label: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginTop: 10,
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
    marginTop: 4,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.chipBackground,
  },
  typeChipActive: {
    backgroundColor: colors.chipActiveBackground,
  },
  typeChipText: {
    color: colors.chipText,
    fontWeight: "600",
    fontSize: 12,
  },
  typeChipTextActive: {
    color: colors.chipTextActive,
  },
  pickerButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pickerButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fileBtnText: {
    fontWeight: "700",
    color: colors.textPrimary,
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
