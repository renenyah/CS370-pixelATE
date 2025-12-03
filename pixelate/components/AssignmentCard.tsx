// components/AssignmentCard.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react-native";

import { useAssignments, safeISO, Draft } from "./AssignmentsContext";
import { API_BASE } from "../constant/api";
import { colors } from "../constant/colors";

type Props = {
  title: string;
  dueDate: string;
  course: string;
  /**
   * When true, shows the "Upload from image" button and editor.
   * You can set this only on the screen where you add assignments.
   */
  enableImageImport?: boolean;
};

type OcrItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  assignment_type?: string;
};

type OcrResponse = {
  status?: "ok" | "error";
  message?: string;
  items?: OcrItem[];
};

const ASSIGNMENT_TYPES: Draft["type"][] = [
  "Assignment",
  "Quiz",
  "Test",
  "Presentation",
];

function normalizeTypeFromBackend(t?: string | null): Draft["type"] {
  const v = (t || "").toLowerCase();
  if (v.includes("quiz")) return "Quiz";
  if (v.includes("exam") || v.includes("test")) return "Test";
  if (v.includes("present")) return "Presentation";
  return "Assignment";
}

function nextDraftId(): string {
  return `img_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AssignmentCard({
  title,
  dueDate,
  course,
  enableImageImport = false,
}: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  const [parsing, setParsing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const handleBackendError = (msg?: string) => {
    Alert.alert("Image upload failed", msg || "Server error");
  };

  const makeDraftsFromItems = (items: OcrItem[]) => {
    if (!items || !items.length) {
      Alert.alert(
        "No assignments found",
        "The extractor didn’t find any assignments in this image."
      );
      return;
    }

    const ds: Draft[] = items.map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      // force to this card's class so it’s “for a specific class”
      course: course || "",
      type: normalizeTypeFromBackend(it.assignment_type),
      // backend already gives iso with 23:59 default; safeISO keeps or normalizes
      dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
      description: "",
    }));

    setDrafts(ds);
    setEditOpen(true);
  };

  const handleUploadImage = useCallback(async () => {
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
          name: asset.fileName || `assignment_${Date.now()}.jpg`,
          type: asset.type || "image/jpeg",
        } as any
      );

      const base = API_BASE.replace(/\/$/, "");
      const url = `${base}/assignments/image?preprocess=${encodeURIComponent(
        "screenshot"
      )}&use_llm=false`;

      console.log("IMAGE (single assignment) →", url);

      const resp = await fetch(url, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        console.log("Image resp not ok:", resp.status, resp.statusText);
        return handleBackendError(`HTTP ${resp.status} – ${resp.statusText}`);
      }

      let json: OcrResponse | any;
      try {
        json = (await resp.json()) as OcrResponse;
      } catch (e: any) {
        console.log("Image JSON parse error:", e);
        return handleBackendError("Could not parse server response.");
      }

      console.log("Image resp (single assignment) →", JSON.stringify(json));

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
  }, [course]);

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const addEmptyDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        title: "",
        course: course || "",
        type: "Assignment",
        dueISO: safeISO(null),
        description: "",
      },
    ]);
  };

  const handleSaveAssignments = () => {
    if (!drafts.length) {
      setEditOpen(false);
      return;
    }
    const cleaned = drafts.map((d) => ({
      ...d,
      course: course || d.course,
      dueISO: safeISO(d.dueISO || null),
    }));
    addAssignmentsFromDrafts(cleaned);
    setEditOpen(false);
    setDrafts([]);
  };

  return (
    <>
      {/* Original card UI (unchanged visuals) */}
      <View style={styles.card}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {!!course && <Text style={styles.course}>{course}</Text>}
          {!!dueDate && <Text style={styles.date}>Due: {dueDate}</Text>}
        </View>

        {enableImageImport && (
          <TouchableOpacity
            style={styles.imageBtn}
            onPress={handleUploadImage}
            disabled={parsing}
          >
            <ImageIcon size={16} color="#111827" />
            <Text style={styles.imageBtnText}>
              {parsing ? "Parsing…" : "Upload from image"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Editor modal for the extracted assignments */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review extracted assignments</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              These were pulled from the image for{" "}
              <Text style={{ fontWeight: "700" }}>{course || "this class"}</Text>.
              Edit the fields, change the type, or delete/add items. To change the
              default 11:59pm time, include a time in the date like
              {" 2025-12-01T15:00"}.
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {drafts.map((d) => (
                <View key={d.id} style={styles.editCard}>
                  <View style={styles.editHeaderRow}>
                    <Text style={styles.editLabel}>Assignment title</Text>
                    <TouchableOpacity onPress={() => deleteDraft(d.id)}>
                      <Trash2 size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.input}
                    value={d.title}
                    onChangeText={(t) => updateDraft(d.id, "title", t)}
                    placeholder="Assignment title"
                    placeholderTextColor={colors.textSecondary + "99"}
                  />

                  <Text style={styles.editLabel}>Class</Text>
                  <View style={styles.classPill}>
                    <Text style={styles.classPillText}>
                      {course || d.course || "This class"}
                    </Text>
                  </View>

                  <Text style={styles.editLabel}>Type</Text>
                  <View style={styles.typeRow}>
                    {ASSIGNMENT_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeChip,
                          d.type === t && styles.typeChipActive,
                        ]}
                        onPress={() => updateDraft(d.id, "type", t)}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            d.type === t && styles.typeChipTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.editLabel}>
                    Due date &amp; time (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={d.dueISO || ""}
                    onChangeText={(t) => updateDraft(d.id, "dueISO", t)}
                    placeholder="2025-11-21 or 2025-11-21T23:59"
                    placeholderTextColor={colors.textSecondary + "99"}
                  />

                  <Text style={styles.editLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    multiline
                    textAlignVertical="top"
                    value={d.description || ""}
                    onChangeText={(t) => updateDraft(d.id, "description", t)}
                    placeholder="Notes or details…"
                    placeholderTextColor={colors.textSecondary + "99"}
                  />
                </View>
              ))}

              <TouchableOpacity style={styles.addRowBtn} onPress={addEmptyDraft}>
                <Text style={styles.addRowText}>+ Add another assignment</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setEditOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleSaveAssignments}
              >
                <Text style={styles.modalSaveText}>Save assignments</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontWeight: "700", fontSize: 16 },
  course: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  date: { color: "#7C3AED", fontWeight: "600", marginTop: 4 },

  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    gap: 6,
  },
  imageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  modalSub: {
    marginTop: 6,
    marginBottom: 10,
    color: colors.textSecondary,
    fontSize: 13,
  },

  editCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  editHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 4,
  },

  classPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    marginBottom: 4,
  },
  classPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3730A3",
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFFFFF",
  },
  typeChipActive: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },

  addRowBtn: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
  },
  addRowText: {
    fontWeight: "700",
    color: colors.textPrimary,
  },

  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  modalSaveBtn: {
    backgroundColor: colors.blue,
  },
  modalCancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
