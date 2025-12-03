// components/UploadSyllabusModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { X, FileText } from "lucide-react-native";

import {
  Draft,
  AssignmentType,
  safeISO,
} from "./AssignmentsContext";
import { colors } from "../constant/colors";
import { API_BASE } from "../constant/api";
import DraftEditorModal from "./DraftEditorModal";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type PdfItem = {
  title: string;
  course?: string;
  due_date_raw?: string;
  due_date_iso?: string;
  assignment_type?: string;
  page?: number | null;
};

type PdfResponse = {
  status?: "ok" | "error";
  message?: string;
  course_name?: string;
  items?: PdfItem[];
};

function nextDraftId(): string {
  return `d_${Math.random().toString(36).slice(2, 10)}`;
}

const TYPE_OPTIONS_MAP: AssignmentType[] = [
  "Assignment",
  "Quiz",
  "Test",
  "Project",
  "Discussion",
  "Reading",
  "Art",
  "Other",
];

function mapType(raw?: string): AssignmentType {
  if (!raw) return "Assignment";
  const t = raw.toLowerCase();
  if (t.includes("quiz")) return "Quiz";
  if (t.includes("exam") || t.includes("test"))
    return "Test";
  if (t.includes("project")) return "Project";
  if (t.includes("discussion")) return "Discussion";
  if (t.includes("reading")) return "Reading";
  if (t.includes("art")) return "Art";
  return "Assignment";
}

export default function UploadSyllabusModal({
  visible,
  onClose,
}: Props) {
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editorVisible, setEditorVisible] =
    useState(false);
  const [courseName, setCourseName] =
    useState<string>("");

  const resetState = () => {
    setParsing(false);
    setDrafts([]);
    setEditorVisible(false);
    setCourseName("");
  };

  const closeAll = () => {
    resetState();
    onClose();
  };

  const handlePdfError = (msg?: string) => {
    Alert.alert(
      "Upload failed",
      msg || "There was a problem reading this PDF."
    );
  };

  const buildDraftsFromPdf = (
    items: PdfItem[],
    inferredCourse: string
  ) => {
    const ds: Draft[] = (items || []).map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      course:
        it.course || inferredCourse || "Untitled Course",
      type: mapType(it.assignment_type),
      dueISO: safeISO(
        it.due_date_iso || it.due_date_raw || null
      ),
      description: "",
    }));

    if (!ds.length) {
      Alert.alert(
        "No assignments found",
        "The parser didn't detect any assignments in this syllabus."
      );
      return;
    }

    setDrafts(ds);
    setEditorVisible(true);
  };

  const handlePickPdf = async () => {
    const res =
      await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

    if (res.canceled || !res.assets?.[0]) return;

    const file = res.assets[0];
    setParsing(true);

    try {
      const fd = new FormData();
      fd.append(
        "file",
        {
          uri: file.uri,
          name: file.name || "syllabus.pdf",
          type: "application/pdf",
        } as any
      );

      const base = API_BASE.replace(/\/$/, "");
      // if you want to toggle LLM usage, change use_llm here
      const url = `${base}/assignments/pdf?use_llm=false`;
      console.log("PDF →", url);

      const resp = await fetch(url, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        console.log(
          "PDF resp not ok:",
          resp.status,
          resp.statusText
        );
        return handlePdfError(
          `HTTP ${resp.status} – ${resp.statusText}`
        );
      }

      let json: PdfResponse | any;
      try {
        json = (await resp.json()) as PdfResponse;
      } catch (e: any) {
        console.log("PDF JSON parse error:", e);
        return handlePdfError(
          "Could not parse server response."
        );
      }

      console.log(
        "PDF resp →",
        JSON.stringify(json)
      );

      if (json?.status === "error") {
        return handlePdfError(json?.message);
      }

      const course =
        json?.course_name || file.name || "";
      setCourseName(course);

      const items = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : [];

      if (!items.length) {
        return handlePdfError(
          "No assignments found in this file."
        );
      }

      buildDraftsFromPdf(items, course);
    } catch (err: any) {
      console.log("PDF parse error:", err);
      handlePdfError(
        String(err?.message || err)
      );
    } finally {
      setParsing(false);
    }
  };

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
              <Text style={styles.title}>
                Upload syllabus
              </Text>
              <TouchableOpacity
                onPress={closeAll}
              >
                <X
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sub}>
              Choose a PDF syllabus and we’ll try to
              extract your assignments and due dates.
            </Text>

            <ScrollView
              style={{ maxHeight: 320 }}
              contentContainerStyle={{
                paddingBottom: 8,
              }}
            >
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
                    ? "Parsing PDF…"
                    : "Choose PDF file"}
                </Text>
              </TouchableOpacity>

              {courseName ? (
                <View style={styles.courseHint}>
                  <Text style={styles.courseHintText}>
                    Detected course:{" "}
                    <Text
                      style={{
                        fontWeight: "700",
                      }}
                    >
                      {courseName}
                    </Text>
                  </Text>
                </View>
              ) : null}
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
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Separate review popup, same as for images */}
      <DraftEditorModal
        visible={editorVisible}
        initialDrafts={drafts}
        onClose={() => setEditorVisible(false)}
        onSave={(ds) => {
          // saving into AssignmentsContext happens in DraftEditorModal's parent (UploadSyllabusModal is just collecting),
          // you already wired that up earlier with addAssignmentsFromDrafts
          // so typically you pass ds up to a handler in parent (_layout / screen),
          // but if you're calling DraftEditorModal from root, that’s already done.
          setEditorVisible(false);
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
  sub: {
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 16,
  },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fileBtnText: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  courseHint: {
    marginTop: 12,
  },
  courseHintText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
});
