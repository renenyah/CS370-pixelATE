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
import { Image as ImageIcon, Trash2, X } from "lucide-react-native";

import { useAssignments, safeISO, Draft } from "./AssignmentsContext";
import { API_BASE } from "../constant/api";
import { colors } from "../constant/colors";

type Props = {
  title: string;
  dueDate: string; // display string, e.g. "12/6/2025" or ISO-ish
  course: string;
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
  "Project",
];

function normalizeTypeFromBackend(t?: string | null): Draft["type"] {
  const v = (t || "").toLowerCase();
  if (v.includes("quiz")) return "Quiz";
  if (v.includes("exam") || v.includes("test")) return "Test";
  if (v.includes("present")) return "Project";
  return "Assignment";
}

function nextDraftId(): string {
  return `img_${Math.random().toString(36).slice(2, 10)}`;
}

// Split stored due string into date + time text boxes
function splitDue(due?: string | null): { date: string; time: string } {
  if (!due) return { date: "", time: "" };
  const trimmed = due.trim();

  // try ISO: YYYY-MM-DD or YYYY-MM-DDTHH:MM
  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?$/
  );
  if (match) {
    return {
      date: match[1],
      time: match[2] || "",
    };
  }

  // fallback: first 10 chars as date, next 5 as time if present
  const date = trimmed.slice(0, 10);
  const time = trimmed.slice(11, 16);
  return { date, time };
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

  // ---------- Image → backend OCR ----------

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
      course: course || "",
      type: normalizeTypeFromBackend(it.assignment_type),
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
        return handleBackendError(
          `HTTP ${resp.status} – ${resp.statusText}`
        );
      }

      let json: OcrResponse | any;
      try {
        json = (await resp.json()) as OcrResponse;
      } catch (e: any) {
        console.log("Image JSON parse error:", e);
        return handleBackendError("Could not parse server response.");
      }

      console.log(
        "Image resp (single assignment) →",
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
  }, [course]);

  // ---------- Editing helpers ----------

  const updateDraftField = (
    id: string,
    field: keyof Draft,
    value: string
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const updateDraftDue = (
    id: string,
    newDate: string,
    newTime: string
  ) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const date = newDate.trim();
        const time = newTime.trim();
        const combined =
          date && time ? `${date} ${time}` : date || "";
        return { ...d, dueISO: combined || null };
      })
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
        dueISO: null,
        description: "",
      },
    ]);
  };

  // Open editor pre-filled with this card’s current data
  const openEditWithCurrent = () => {
    const iso = safeISO(dueDate || null);
    setDrafts([
      {
        id: nextDraftId(),
        title: title || "",
        course: course || "",
        type: "Assignment",
        dueISO: iso,
        description: "",
      },
    ]);
    setEditOpen(true);
  };

  const handleSaveAssignments = () => {
    if (!drafts.length) {
      setEditOpen(false);
      return;
    }
    const cleaned = drafts.map((d) => ({
      ...d,
      course: d.course || course || "",
      dueISO: safeISO(d.dueISO || null),
    }));
    addAssignmentsFromDrafts(cleaned);
    setEditOpen(false);
    setDrafts([]);
  };

  // ---------- Render ----------

  return (
    <>
      {/* main card */}
      <View style={styles.card}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {!!course && <Text style={styles.course}>{course}</Text>}
          {!!dueDate && <Text style={styles.date}>Due: {dueDate}</Text>}
        </View>

        <View style={styles.rightButtons}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={openEditWithCurrent}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          {enableImageImport && (
            <TouchableOpacity
              style={styles.imageBtn}
              onPress={handleUploadImage}
              disabled={parsing}
            >
              <ImageIcon size={16} color="#111827" />
              <Text style={styles.imageBtnText}>
                {parsing ? "Parsing…" : "Upload"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* editor modal */}
      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit assignment</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Change the title, class, assignment type, due date, due time, or
              description. When you’re done, tap “Save assignments”.
            </Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {drafts.map((d) => {
                const { date, time } = splitDue(d.dueISO || "");
                return (
                  <View key={d.id} style={styles.editCard}>
                    <View style={styles.editHeaderRow}>
                      <Text style={styles.editLabel}>Assignment title</Text>
                      <TouchableOpacity
                        onPress={() => deleteDraft(d.id)}
                      >
                        <Trash2
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      value={d.title}
                      onChangeText={(t) =>
                        updateDraftField(d.id, "title", t)
                      }
                      placeholder="Assignment title"
                      placeholderTextColor={colors.textSecondary + "99"}
                    />

                    <Text style={styles.editLabel}>Class</Text>
                    <TextInput
                      style={styles.input}
                      value={d.course || course || ""}
                      onChangeText={(t) =>
                        updateDraftField(d.id, "course", t)
                      }
                      placeholder="e.g., CS 370 – Algorithms"
                      placeholderTextColor={colors.textSecondary + "99"}
                    />

                    <Text style={styles.editLabel}>Assignment type</Text>
                    <View style={styles.typeRow}>
                      {ASSIGNMENT_TYPES.map((t) => {
                        const active = d.type === t;
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[
                              styles.typeChip,
                              active && styles.typeChipActive,
                            ]}
                            onPress={() =>
                              updateDraftField(d.id, "type", t)
                            }
                          >
                            <Text
                              style={[
                                styles.typeChipText,
                                active && styles.typeChipTextActive,
                              ]}
                            >
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.editLabel}>
                      Due date (YYYY-MM-DD)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={date}
                      onChangeText={(t) =>
                        updateDraftDue(d.id, t, time)
                      }
                      placeholder="2025-11-21"
                      placeholderTextColor={colors.textSecondary + "99"}
                    />

                    <Text style={styles.editLabel}>
                      Due time (HH:MM — optional)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={time}
                      onChangeText={(t) =>
                        updateDraftDue(d.id, date, t)
                      }
                      placeholder="23:59"
                      placeholderTextColor={colors.textSecondary + "99"}
                    />

                    <Text style={styles.editLabel}>
                      Description (optional)
                    </Text>
                    <TextInput
                      style={[styles.input, { height: 70 }]}
                      multiline
                      textAlignVertical="top"
                      value={d.description || ""}
                      onChangeText={(t) =>
                        updateDraftField(d.id, "description", t)
                      }
                      placeholder="Notes or details…"
                      placeholderTextColor={colors.textSecondary + "99"}
                    />
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addRowBtn}
                onPress={addEmptyDraft}
              >
                <Text style={styles.addRowText}>
                  + Add another assignment
                </Text>
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
                <Text style={styles.modalSaveText}>
                  Save assignments
                </Text>
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

  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

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
