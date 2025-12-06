// components/UploadSyllabusModal.tsx
import React, { useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { X, Wand2, FileText, Trash2 } from "lucide-react-native";

import { colors } from "../constant/colors";
import { API_BASE } from "../constant/api";
import {
  Draft,
  safeISO,
  useAssignments,
  AssignmentType,
} from "./AssignmentsContext";

type DueItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  page?: number | null;
  course?: string;
  source?: string;
  assignment_type?: string; // from backend
};

type ApiResponse = {
  status?: "ok" | "error";
  message?: string;
  items?: DueItem[];
  course_name?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Step = "upload" | "review";

const SEMESTERS = ["Spring", "Summer", "Fall", "Winter"];

const CLASS_COLORS = [
  colors.lavender,
  colors.pink,
  colors.blueLight,
  colors.blue,
  "#FDE68A",
];

const TYPE_OPTIONS: AssignmentType[] = [
  "Assignment",
  "Quiz",
  "Test",
  "Presentation",
  "Project",
  "Reading",
  "Discussion",
  "Art",
  "Other",
];

function nextDraftId(): string {
  return `d_${Math.random().toString(36).slice(2, 10)}`;
}

// Simple fetch-with-timeout helper so we don't hang forever
async function fetchWithTimeout(
  resource: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  return Promise.race([
    fetch(resource, options),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Request timed out")),
        timeoutMs
      )
    ),
  ]);
}

function mapBackendType(raw?: string | null): AssignmentType {
  const t = (raw || "").toLowerCase();
  if (t.includes("quiz")) return "Quiz";
  if (t.includes("test") || t.includes("exam")) return "Test";
  if (t.includes("present")) return "Presentation";
  if (t.includes("project")) return "Project";
  if (t.includes("reading")) return "Reading";
  if (t.includes("discussion")) return "Discussion";
  if (t.includes("art")) return "Art";
  return "Assignment";
}

export default function UploadSyllabusModal({
  visible,
  onClose,
}: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  const [step, setStep] = useState<Step>("upload");

  const [aiRepair, setAiRepair] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [semester, setSemester] = useState<string>("Fall");
  const [year, setYear] = useState<string>("2025");
  const [folderColor, setFolderColor] = useState<string>(
    colors.lavender
  );
  const [syllabusText, setSyllabusText] = useState("");

  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const closeAll = () => {
    setDrafts([]);
    setSyllabusText("");
    setStep("upload");
    setAiRepair(false);
    onClose();
  };

  const handleBackendError = (msg?: string) => {
    Alert.alert("Upload failed", msg || "Server error");
  };

  const makeDraftsFromItems = (items: DueItem[]) => {
    const yearNum = Number(year || "");
    const normalizedYear =
      !isNaN(yearNum) && yearNum > 1900 ? yearNum : undefined;

    const ds: Draft[] = (items || []).map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      course: courseName || it.course || "",
      type: mapBackendType(it.assignment_type),
      dueISO: safeISO(
        it.due_date_iso || it.due_date_raw || null
      ),
      description: "",
      semester,
      year: normalizedYear,
      semesterLabel:
        semester && normalizedYear
          ? `${semester} ${normalizedYear}`
          : undefined,
      color: folderColor,
    }));

    if (!ds.length) {
      Alert.alert(
        "No assignments found",
        "The extractor didn't find any assignments in this syllabus."
      );
      return;
    }

    setDrafts(ds);
    setStep("review");
  };

  const handleSaveAssignments = () => {
    if (!drafts.length) {
      closeAll();
      return;
    }
    const cleaned = drafts.map((d) => ({
      ...d,
      dueISO: safeISO(d.dueISO || null),
    }));
    addAssignmentsFromDrafts(cleaned);
    closeAll();
  };

  const updateDraft = (
    id: string,
    field: keyof Draft,
    value: string | AssignmentType
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddBlankDraft = () => {
    const yearNum = Number(year || "");
    const normalizedYear =
      !isNaN(yearNum) && yearNum > 1900 ? yearNum : undefined;

    const d: Draft = {
      id: nextDraftId(),
      title: "",
      course: courseName,
      type: "Assignment",
      dueISO: null,
      description: "",
      semester,
      year: normalizedYear,
      semesterLabel:
        semester && normalizedYear
          ? `${semester} ${normalizedYear}`
          : undefined,
      color: folderColor,
    };
    setDrafts((prev) => [...prev, d]);
  };

// ------------ PDF ------------
const handlePickPdf = useCallback(async () => {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return;

  const asset = res.assets[0];
  setParsing(true);

  try {
    const fd = new FormData();

    if (Platform.OS === "web") {
      // 🔹 On web we need a real File/Blob, not { uri, name, type }
      const existingFile = (asset as any).file as File | undefined;

      let file: File;
      if (existingFile) {
        file = existingFile;
      } else {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        file = new File(
          [blob],
          asset.name || `syllabus_${Date.now()}.pdf`,
          { type: asset.mimeType || "application/pdf" }
        );
      }

      fd.append("file", file);
    } else {
      // 🔹 Native (iOS/Android) – keep the RN-style object
      fd.append(
        "file",
        {
          uri: asset.uri,
          name: asset.name || `syllabus_${Date.now()}.pdf`,
          type: asset.mimeType || "application/pdf",
        } as any
      );
    }

    const base = API_BASE.replace(/\/$/, "");
    const url = `${base}/assignments/pdf?use_llm=${aiRepair ? "true" : "false"}`;
    console.log("PDF →", url);

    const resp = await fetch(url, {
      method: "POST",
      body: fd,
    });

    if (!resp.ok) {
      console.log("PDF resp not ok:", resp.status, resp.statusText);
      return handleBackendError(`HTTP ${resp.status} – ${resp.statusText}`);
    }

    let json: ApiResponse | any;
    try {
      json = (await resp.json()) as ApiResponse;
    } catch (e: any) {
      console.log("PDF JSON parse error:", e);
      return handleBackendError("Could not parse server response.");
    }

    console.log("PDF resp →", JSON.stringify(json));

    if (json.course_name && !courseName) {
      setCourseName(json.course_name);
    }

    const items = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json)
      ? json
      : [];

    makeDraftsFromItems(items);
  } catch (e: any) {
    console.log("PDF parse error:", e);
    Alert.alert("Error", String(e?.message || e));
  } finally {
    setParsing(false);
  }
}, [aiRepair, courseName, semester, year, folderColor]);

  // ------------ TEXT ------------
  const handleParseText = useCallback(async () => {
    if (!syllabusText.trim()) {
      Alert.alert(
        "Add some text",
        "Paste syllabus text first."
      );
      return;
    }
    setParsing(true);
    try {
      const url = buildUrl("/assignments/text");
      console.log("TEXT →", url);

      const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: syllabusText }),
      });

      if (!resp.ok) {
        console.log(
          "Text resp not ok:",
          resp.status,
          resp.statusText
        );
        return handleBackendError(
          `HTTP ${resp.status} – ${resp.statusText}`
        );
      }

      let json: ApiResponse | any;
      try {
        json = (await resp.json()) as ApiResponse;
      } catch (e: any) {
        console.log("Text JSON parse error:", e);
        return handleBackendError(
          "Could not parse server response."
        );
      }

      console.log("Text resp →", json);

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      makeDraftsFromItems(items);
    } catch (e: any) {
      console.log("Text parse error:", e);
      if (e?.message === "Request timed out") {
        Alert.alert(
          "Timeout",
          "The server took too long to respond. It might be sleeping or offline."
        );
      } else {
        Alert.alert("Error", String(e?.message || e));
      }
    } finally {
      setParsing(false);
    }
  }, [syllabusText, courseName, semester, year, folderColor]);

  // ------------ RENDER ------------
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
            <Text style={styles.title}>
              {step === "upload"
                ? "Upload Syllabus"
                : "Review Assignments"}
            </Text>
            <TouchableOpacity onPress={closeAll}>
              <X size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {step === "upload" ? (
            <>
              <Text style={styles.sub}>
                Paste syllabus text or upload a PDF. We’ll
                extract assignments and dates. Toggle AI
                Repair to clean up dates.
              </Text>

              {/* AI toggle */}
              <View style={styles.aiRow}>
                <TouchableOpacity
                  onPress={() => setAiRepair((v) => !v)}
                  style={[
                    styles.aiToggle,
                    aiRepair && styles.aiToggleOn,
                  ]}
                >
                  <Wand2
                    size={18}
                    color={
                      aiRepair
                        ? "#fff"
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.aiToggleText,
                      aiRepair &&
                        styles.aiToggleTextOn,
                    ]}
                  >
                    AI Repair
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={{
                  paddingBottom: 8,
                }}
              >
                <Text style={styles.label}>
                  Class Name
                </Text>
                <TextInput
                  placeholder="e.g., CS 370 – Algorithms"
                  placeholderTextColor={
                    colors.textSecondary + "99"
                  }
                  style={styles.input}
                  value={courseName}
                  onChangeText={setCourseName}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.label}>
                      Semester
                    </Text>
                    <View style={styles.chipRow}>
                      {SEMESTERS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.chip,
                            semester === s &&
                              styles.chipActive,
                          ]}
                          onPress={() =>
                            setSemester(s)
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              semester === s &&
                                styles.chipTextActive,
                            ]}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ width: 90 }}>
                    <Text style={styles.label}>Year</Text>
                    <TextInput
                      placeholder="2025"
                      placeholderTextColor={
                        colors.textSecondary + "99"
                      }
                      style={styles.input}
                      value={year}
                      onChangeText={setYear}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.label}>
                  Folder Color
                </Text>
                <View style={styles.colorRow}>
                  {CLASS_COLORS.map((c, idx) => (
                    <TouchableOpacity
                      key={`${c}-${idx}`}
                      onPress={() =>
                        setFolderColor(c)
                      }
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        folderColor === c &&
                          styles.colorDotActive,
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.label}>
                  Syllabus Text
                </Text>
                <TextInput
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholder="Paste syllabus text here…"
                  placeholderTextColor={
                    colors.textSecondary + "99"
                  }
                  style={[
                    styles.input,
                    { height: 120 },
                  ]}
                  value={syllabusText}
                  onChangeText={setSyllabusText}
                />

                <View style={styles.rowButtons}>
                  <TouchableOpacity
                    style={styles.fileBtn}
                    onPress={handlePickPdf}
                    disabled={parsing}
                  >
                    <FileText
                      size={18}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.fileBtnText}>
                      {parsing
                        ? "Parsing…"
                        : "Upload PDF"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.cancelBtn,
                  ]}
                  onPress={closeAll}
                  disabled={parsing}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.primaryBtn,
                  ]}
                  onPress={handleParseText}
                  disabled={parsing}
                >
                  <Text style={styles.primaryText}>
                    {parsing
                      ? "Parsing…"
                      : "Parse Text"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sub}>
                Review the extracted assignments. Edit
                anything that looks off, add new ones, or
                delete rows you don’t want to keep.
              </Text>

              <ScrollView
                style={{ maxHeight: 420 }}
                contentContainerStyle={{
                  paddingBottom: 8,
                }}
              >
                {drafts.map((d) => (
                  <View
                    key={d.id}
                    style={styles.card}
                  >
                    <View
                      style={styles.cardHeader}
                    >
                      <Text style={styles.cardLabel}>
                        Assignment title
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          deleteDraft(d.id)
                        }
                      >
                        <Trash2
                          size={18}
                          color={
                            colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.input}
                      value={d.title}
                      onChangeText={(t) =>
                        updateDraft(
                          d.id,
                          "title",
                          t
                        )
                      }
                      placeholder="Assignment title"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />

                    <Text style={styles.cardLabel}>
                      Class name
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={d.course}
                      onChangeText={(t) =>
                        updateDraft(
                          d.id,
                          "course",
                          t
                        )
                      }
                      placeholder="e.g., AS 110-3 – Rome Sketchbook"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />

                    <Text style={styles.cardLabel}>
                      Due date (YYYY-MM-DD or
                      MM/DD/YYYY)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={d.dueISO || ""}
                      onChangeText={(t) =>
                        updateDraft(
                          d.id,
                          "dueISO",
                          t
                        )
                      }
                      placeholder="2025-02-03"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />

                    <Text style={styles.cardLabel}>
                      Type
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      style={{
                        marginBottom: 4,
                      }}
                    >
                      {TYPE_OPTIONS.map(
                        (opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              styles.typeChip,
                              d.type === opt &&
                                styles.typeChipActive,
                            ]}
                            onPress={() =>
                              updateDraft(
                                d.id,
                                "type",
                                opt
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.typeChipText,
                                d.type === opt &&
                                  styles.typeChipTextActive,
                              ]}
                            >
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </ScrollView>

                    <Text style={styles.cardLabel}>
                      Description (optional)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { height: 70 },
                      ]}
                      multiline
                      textAlignVertical="top"
                      value={d.description || ""}
                      onChangeText={(t) =>
                        updateDraft(
                          d.id,
                          "description",
                          t
                        )
                      }
                      placeholder="Notes or details…"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddBlankDraft}
                >
                  <Text style={styles.addBtnText}>
                    Add another assignment
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.cancelBtn,
                  ]}
                  onPress={closeAll}
                >
                  <Text style={styles.cancelText}>
                    Discard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.primaryBtn,
                  ]}
                  onPress={handleSaveAssignments}
                >
                  <Text style={styles.primaryText}>
                    Save assignments
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  aiRow: {
    alignItems: "flex-start",
    marginBottom: 6,
  },
  aiToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.chipBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiToggleOn: {
    backgroundColor: colors.lavender,
  },
  aiToggleText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  aiToggleTextOn: {
    color: "#fff",
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
  rowButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  fileBtn: {
    flex: 1,
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
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 6,
    marginBottom: 4,
  },
  typeChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  typeChipText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  addBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    fontWeight: "600",
    color: "#111827",
  },
});
