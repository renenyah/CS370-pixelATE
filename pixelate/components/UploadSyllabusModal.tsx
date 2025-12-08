// components/UploadSyllabusModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { X, FileText, Trash2, Wand2 } from "lucide-react-native";

import {
  Draft,
  useAssignments,
  assignmentIdentityKey,
} from "./AssignmentsContext";
import { colors } from "../constant/colors";
import { buildUrl } from "../constant/api";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const SEMESTERS = ["Spring", "Summer", "Fall"] as const;

// ✅ local color options instead of importing CLASS_COLORS
const CLASS_COLORS = [
  "#CDB4DB", // lavender
  "#FFC8FC", // pink
  "#FBBF24", // accent
  "#BDE0FE", // blueLight
  "#A2D2FF", // blue
  "#CCE2CB", // green
];

export default function UploadSyllabusModal({
  visible,
  onClose,
}: Props) {
  const { assignments, addAssignmentsFromDrafts } =
    useAssignments();

  const [step, setStep] = useState<"upload" | "review">(
    "upload"
  );
  const [courseName, setCourseName] =
    useState<string>("");
  const [semester, setSemester] =
    useState<string>("Fall");
  const [year, setYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const [folderColor, setFolderColor] =
    useState<string>(CLASS_COLORS[0]);
  const [syllabusText, setSyllabusText] =
    useState<string>("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [parsing, setParsing] = useState(false);
  const [aiRepair, setAiRepair] = useState(false);

  const resetState = () => {
    setStep("upload");
    setCourseName("");
    setSemester("Fall");
    setYear(String(new Date().getFullYear()));
    setFolderColor(CLASS_COLORS[0]);
    setSyllabusText("");
    setDrafts([]);
    setParsing(false);
  };

  const closeAll = () => {
    resetState();
    onClose();
  };

  const updateDraft = (
    id: string,
    field: keyof Draft,
    value: any
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

// ---- PDF picker with backend call ----
const handlePickPdf = async () => {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled || !res.assets?.length) {
      return;
    }

    const asset = res.assets[0];
    setParsing(true);

    const form = new FormData();
    
    // 🌐 Web vs Native file handling
    if (Platform.OS === "web") {
      // On web, asset.file is a File/Blob object
      if (asset.file) {
        form.append("file", asset.file, asset.name || "syllabus.pdf");
      } else {
        // Fallback: fetch the blob from URI
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        form.append("file", blob, asset.name || "syllabus.pdf");
      }
    } else {
      // On mobile, use the URI
      form.append("file", {
        uri: asset.uri,
        name: asset.name ?? "syllabus.pdf",
        type: "application/pdf",
      } as any);
    }

    const url = buildUrl(
      `/assignments/pdf?use_llm=${aiRepair ? "true" : "false"}`
    );
    console.log("PDF →", url);

    const resp = await fetch(url, {
      method: "POST",
      body: form,
    });

    if (!resp.ok) {
      if (resp.status === 409) {
        setParsing(false);
        Alert.alert(
          "Already uploaded",
          "This syllabus (or an identical copy) has already been uploaded. If you need to adjust assignments, edit them from the Classes tab."
        );
        return;
      }

      console.log("PDF resp not ok:", resp.status, resp.statusText);
      setParsing(false);
      Alert.alert("Error", `Failed to parse PDF (HTTP ${resp.status}).`);
      return;
    }

    const json = await resp.json();
    console.log("PDF parsed:", json);

    const serverItems: any[] = json.items || json.assignments || [];

    const extracted: Draft[] = serverItems.map((a: any) => {
      const rawDue =
        a.due_date_iso || (a.due_at ? String(a.due_at).slice(0, 10) : null);

      return {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        title: a.title ?? "",
        course: courseName || a.course || "",
        type: a.assignment_type ?? a.type,
        dueISO: rawDue,
        description: a.description || "",
        semester,
        year: Number(year) || undefined,
        color: folderColor,
        priority: "medium",
      };
    });

    setDrafts(extracted);
    setStep("review");
    setParsing(false);
  } catch (e: any) {
    console.error("PDF parse error:", e);
    setParsing(false);
    Alert.alert("Error", "There was a problem parsing the PDF.");
  }
};

  const handleParseText = async () => {
    if (!syllabusText.trim()) {
      Alert.alert(
        "Missing text",
        "Paste syllabus text or upload a PDF first."
      );
      return;
    }

    const newDraft: Draft = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      title: "Syllabus assignment",
      course: courseName || "",
      description: syllabusText.trim(),
      dueISO: null,
      semester,
      year: Number(year) || undefined,
      color: folderColor,
      priority: "medium",
    };

    setDrafts([newDraft]);
    setStep("review");
  };

  const handleSaveDrafts = async () => {
    if (!drafts.length) {
      Alert.alert(
        "No assignments",
        "There are no assignments to save."
      );
      return;
    }

    // 🔍 FRONTEND duplicate detection
    const existingKeys = new Set(
      assignments.map((a) =>
        assignmentIdentityKey({
          course: a.course,
          title: a.title,
          dueISO: a.dueISO || null,
        })
      )
    );

    const uniqueDrafts = drafts.filter((d) => {
      const key = assignmentIdentityKey({
        course: d.course,
        title: d.title,
        dueISO: d.dueISO || null,
      });
      return !existingKeys.has(key);
    });

    if (uniqueDrafts.length === 0) {
      Alert.alert(
        "Already uploaded",
        "All of these assignments are already in your planner. Nothing new was added."
      );
      closeAll();
      return;
    }

    await addAssignmentsFromDrafts(uniqueDrafts);
    closeAll();
  };

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
              <X
                size={22}
                color={colors.textPrimary}
              />
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
                  onPress={() =>
                    setAiRepair((v) => !v)
                  }
                  style={[
                    styles.aiToggle,
                    aiRepair &&
                      styles.aiToggleOn,
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
                  <View
                    style={{ flex: 1, marginRight: 6 }}
                  >
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
                    <Text style={styles.label}>
                      Year
                    </Text>
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
                    <Text
                      style={styles.fileBtnText}
                    >
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
                      <Text
                        style={styles.cardLabel}
                      >
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

                    <Text
                      style={styles.cardLabel}
                    >
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
                      placeholder="e.g., AS 110-3 – Rome Sketch"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />

                    <Text
                      style={styles.cardLabel}
                    >
                      Due date (YYYY-MM-DD)
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
                      placeholder="2025-09-12"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />

                    <Text
                      style={styles.cardLabel}
                    >
                      Description
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { height: 60 },
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
                      placeholder="Optional details…"
                      placeholderTextColor={
                        colors.textSecondary +
                        "99"
                      }
                    />
                  </View>
                ))}
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
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.primaryBtn,
                  ]}
                  onPress={handleSaveDrafts}
                >
                  <Text style={styles.primaryText}>
                    Save to Planner
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
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  sub: {
    marginBottom: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  aiRow: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  aiToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  aiToggleOn: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  aiToggleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  aiToggleTextOn: {
    color: "#FFFFFF",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 8,
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
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: colors.chipActiveBackground,
    borderColor: colors.chipActiveBackground,
  },
  chipText: {
    fontSize: 12,
    color: colors.chipText,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.chipTextActive,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: {
    borderColor: "#111827",
  },
  rowButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  primaryBtn: {
    backgroundColor: "#4F46E5",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
