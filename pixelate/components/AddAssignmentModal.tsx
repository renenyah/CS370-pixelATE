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
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { X, Image as ImageIcon, Trash2 } from "lucide-react-native";

import {
  useAssignments,
  Draft,
  AssignmentType,
  safeISO,
} from "./AssignmentsContext";
import { colors } from "../constant/colors";
import { buildUrl } from "../constant/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialCourse?: string;
  /** When provided, we send extracted drafts up and close this modal */
  onDraftsExtracted?: (drafts: Draft[]) => void;
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
  onDraftsExtracted,
}: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  // Manual single-assignment form
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(initialCourse || "");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<AssignmentType>("Assignment");

  // Time has a default (11:59 PM). Date is “not chosen” until user picks.
  const defaultTime = useMemo(() => {
    const t = new Date();
    t.setHours(23, 59, 0, 0);
    return t;
  }, []);

  const [date, setDate] = useState<Date>(new Date());
  const [hasPickedDate, setHasPickedDate] = useState(false);
  const [time, setTime] = useState<Date>(defaultTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Extracted from image (used as fallback if onDraftsExtracted not passed)
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const hasExtractedDrafts = drafts.length > 0;

  const resetForm = () => {
    setTitle("");
    setCourse(initialCourse || "");
    setDescription("");
    setType("Assignment");
    setDate(new Date());
    setHasPickedDate(false);
    setTime(defaultTime);
    setDrafts([]);
    setShowDatePicker(false);
    setShowTimePicker(false);
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
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  };

  const handleSaveManual = () => {
    const trimmedTitle = title.trim();
    const trimmedCourse = course.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please enter an assignment name.");
      return;
    }

    let iso: string | null = null;
    if (hasPickedDate) {
      const dateTimeString = combineDateTimeToString(date, time);
      iso = safeISO(dateTimeString);
    }

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

  const capitalizeType = (raw: string): AssignmentType => {
    const lower = raw.toLowerCase();
    if (lower.includes("quiz")) return "Quiz";
    if (lower.includes("test") || lower.includes("exam")) return "Test";
    if (lower.includes("project")) return "Project";
    if (lower.includes("discussion")) return "Discussion";
    if (lower.includes("reading")) return "Reading";
    if (lower.includes("art")) return "Art";
    return "Assignment";
  };

  const makeDraftsFromItems = (items: DueItem[]): Draft[] => {
    const ds: Draft[] = (items || []).map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      // use the manual Class field if present
      course: it.course || course || "Untitled Course",
      type:
        (it.assignment_type &&
          capitalizeType(it.assignment_type)) || "Assignment",
      dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
      description: "",
    }));
    return ds;
  };

// Replace your current handlePickImage function with this:

const handlePickImage = async () => {
  try {
    // 🌐 Web-compatible image picking
    if (Platform.OS === "web") {
      // Create a file input element for web
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setParsing(true);
        try {
          const fd = new FormData();
          fd.append("file", file, file.name);

          const url = buildUrl(
            `/assignments/image?preprocess=${encodeURIComponent(
              "screenshot"
            )}&use_llm=true`
          );
          console.log("IMAGE (AddAssignmentModal) →", url);

          const resp = await fetch(url, {
            method: "POST",
            body: fd,
          });

          if (!resp.ok) {
            console.log("Image resp not ok:", resp.status, resp.statusText);
            return handleBackendError(
              `HTTP ${resp.status} – ${resp.statusText}`
            );
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

          if (!items.length) {
            Alert.alert(
              "No assignments found",
              "The extractor didn't find any assignments in this image."
            );
            return;
          }

          const ds = makeDraftsFromItems(items);

          if (onDraftsExtracted) {
            onDraftsExtracted(ds);
            closeAll();
          } else {
            setDrafts(ds);
          }
        } catch (e: any) {
          console.log("Image parse error:", e);
          Alert.alert("Error", String(e?.message || e));
        } finally {
          setParsing(false);
        }
      };

      input.click();
      return;
    }

    // 📱 Native mobile image picking (iOS/Android)
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

      const url = buildUrl(
        `/assignments/image?preprocess=${encodeURIComponent(
          "screenshot"
        )}&use_llm=true`
      );
      console.log("IMAGE (AddAssignmentModal) →", url);

      const resp = await fetch(url, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        console.log("Image resp not ok:", resp.status, resp.statusText);
        return handleBackendError(
          `HTTP ${resp.status} – ${resp.statusText}`
        );
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

      if (!items.length) {
        Alert.alert(
          "No assignments found",
          "The extractor didn't find any assignments in this image."
        );
        return;
      }

      const ds = makeDraftsFromItems(items);

      if (onDraftsExtracted) {
        onDraftsExtracted(ds);
        closeAll();
      } else {
        setDrafts(ds);
      }
    } catch (e: any) {
      console.log("Image parse error:", e);
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setParsing(false);
    }
  } catch (e: any) {
    console.log("Image picker error:", e);
    Alert.alert("Error", "Failed to pick image");
    setParsing(false);
  }
};

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveExtractedInline = () => {
    if (!drafts.length) {
      Alert.alert("Nothing to save", "No extracted assignments.");
      return;
    }
    const cleaned = drafts.map((d) => ({
      ...d,
      dueISO: safeISO(d.dueISO || null),
    }));
    addAssignmentsFromDrafts(cleaned);
    closeAll();
  };

  const formattedDate = useMemo(
    () =>
      hasPickedDate
        ? date.toLocaleDateString(undefined, {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
          })
        : "Select date",
    [date, hasPickedDate]
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

  // ----- handlers for pickers -----
  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
    if (!selected) return;
    setDate(selected);
    setHasPickedDate(true);
  };

  const onChangeTime = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") {
      setShowTimePicker(false);
    }
    if (!selected) return;
    setTime(selected);
  };

  const hidePickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeAll}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
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
              keyboardShouldPersistTaps="handled"
            >
              {/* Upload image FIRST */}
              <Text style={styles.label}>Upload image</Text>
              <TouchableOpacity
                style={styles.fileBtn}
                onPress={handlePickImage}
                disabled={parsing}
              >
                <ImageIcon size={18} color={colors.textPrimary} />
                <Text style={styles.fileBtnText}>
                  {parsing ? "Parsing…" : "Upload screenshot / photo"}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or add manually</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Manual form */}
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
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !hasPickedDate && {
                          color: colors.textSecondary,
                          fontWeight: "400",
                        },
                      ]}
                    >
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

              {/* Fallback inline extracted editor (only used if onDraftsExtracted not given) */}
              {hasExtractedDrafts && !onDraftsExtracted && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.label}>Extracted assignments</Text>
                  {drafts.map((d) => (
                    <View key={d.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardLabel}>Title</Text>
                        <TouchableOpacity
                          onPress={() => deleteDraft(d.id)}
                        >
                          <Trash2
                            size={18}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.input}
                        value={d.title}
                        onChangeText={(txt) =>
                          updateDraft(d.id, "title", txt)
                        }
                        placeholder="Assignment title"
                        placeholderTextColor={
                          colors.textSecondary + "99"
                        }
                      />

                      <Text style={styles.cardLabel}>Class</Text>
                      <TextInput
                        style={styles.input}
                        value={d.course}
                        onChangeText={(txt) =>
                          updateDraft(d.id, "course", txt)
                        }
                        placeholder="e.g., CS 370"
                        placeholderTextColor={
                          colors.textSecondary + "99"
                        }
                      />

                      <Text style={styles.cardLabel}>
                        Due date (YYYY-MM-DD)
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={d.dueISO || ""}
                        onChangeText={(txt) =>
                          updateDraft(d.id, "dueISO", txt)
                        }
                        placeholder="2025-02-03"
                        placeholderTextColor={
                          colors.textSecondary + "99"
                        }
                      />

                      <Text style={styles.cardLabel}>
                        Description (optional)
                      </Text>
                      <TextInput
                        style={[styles.input, { height: 70 }]}
                        value={d.description || ""}
                        onChangeText={(txt) =>
                          updateDraft(d.id, "description", txt)
                        }
                        placeholder="Notes…"
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor={
                          colors.textSecondary + "99"
                        }
                      />
                    </View>
                  ))}
                </View>
              )}
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
                onPress={
                  hasExtractedDrafts && !onDraftsExtracted
                    ? handleSaveExtractedInline
                    : handleSaveManual
                }
                disabled={parsing}
              >
                <Text style={styles.primaryText}>
                  {hasExtractedDrafts && !onDraftsExtracted
                    ? "Save extracted"
                    : "Save assignment"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* iOS bottom sheet for pickers with Done button */}
          {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
            <View style={styles.iosPickerSheet}>
              <View style={styles.iosPickerToolbar}>
                <TouchableOpacity onPress={hidePickers}>
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={date || new Date()}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  onChange={onChangeDate}
                  style={{ alignSelf: "stretch" }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="spinner"
                  themeVariant="light"
                  onChange={onChangeTime}
                  style={{ alignSelf: "stretch" }}
                />
              )}
            </View>
          )}

          {/* Android inline dialogs */}
          {Platform.OS !== "ios" && showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="default"
              themeVariant="light"
              onChange={onChangeDate}
            />
          )}
          {Platform.OS !== "ios" && showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              themeVariant="light"
              onChange={onChangeTime}
            />
          )}
        </KeyboardAvoidingView>
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
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  iosPickerSheet: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  iosPickerToolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  iosPickerDoneText: {
    fontWeight: "700",
    color: colors.blue,
  },
});
