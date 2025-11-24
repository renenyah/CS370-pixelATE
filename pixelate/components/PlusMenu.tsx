// components/PlusMenu.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Upload,
  Folder,
  FileText,
  X,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  useAssignments,
  Draft,
  safeISO,
} from "./AssignmentsContext";
import DraftEditorModal from "./DraftEditorModal";

type Props = {
  onClose: () => void;
};

type DueItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  page?: number | null;
  source?: string;
  course?: string;
};

type ApiResponse = {
  status: "ok" | "error";
  message?: string;
  pdf_name?: string;
  image_name?: string;
  course_name?: string;
  items?: DueItem[];
  llm_used?: boolean;
  llm_error?: string | null;
};

// CHANGE THIS TO YOUR ACTUAL BACKEND URL
const API_BASE = "http://172.24.227.154:8000".replace(/\/+$/, "");

export default function PlusMenu({ onClose }: Props) {
  const { addAssignmentsFromDrafts } = useAssignments();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);

  const [aiRepair, setAiRepair] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(""); // NEW: Show what's happening

  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const closeAll = () => {
    setUploadOpen(false);
    setAddClassOpen(false);
    setAddAssignmentOpen(false);
    setDraftsOpen(false);
    setDrafts([]);
    setParsing(false);
    setLoadingMessage("");
    onClose();
  };

  const buildDraftsFromItems = (
    resp: ApiResponse,
    items: DueItem[]
  ) => {
    const backendCourse = resp.course_name || "";
    if (!items.length) {
      Alert.alert(
        "No assignments found",
        "Try toggling AI Repair or a different file / text."
      );
      return;
    }

    const ds: Draft[] = items.map((it, idx) => ({
      id: `d_${idx}_${Math.random().toString(36).slice(2, 10)}`,
      title: it.title || "Untitled",
      course: courseName || it.course || backendCourse || "",
      type: "Assignment",
      dueISO: safeISO(
        it.due_date_iso || it.due_date_raw || null
      ),
      description: "",
    }));

    setDrafts(ds);
    setDraftsOpen(true);
  };

  // NEW: Helper function with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 60000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server might be slow or unreachable.');
      }
      throw error;
    }
  };

  const handleUploadPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setParsing(true);
      setLoadingMessage("Uploading PDF..."); // NEW

      const formData = new FormData();
      formData.append(
        "file",
        {
          uri: asset.uri,
          name: asset.name || "syllabus.pdf",
          type: asset.mimeType || "application/pdf",
        } as any
      );

      setLoadingMessage(aiRepair ? "Processing PDF with AI (this may take 30-60 seconds)..." : "Processing PDF..."); // NEW

      const res = await fetchWithTimeout(
        `${API_BASE}/assignments/pdf?use_llm=${String(aiRepair)}`,
        {
          method: "POST",
          body: formData,
        },
        90000 // 90 second timeout for PDFs with AI
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as ApiResponse;

      if (json.status !== "ok") {
        Alert.alert("Upload failed", json.message || "Server error");
        return;
      }

      buildDraftsFromItems(json, json.items || []);
      setUploadOpen(false);
    } catch (e: any) {
      console.error("PDF upload error:", e);
      Alert.alert(
        "Error",
        e?.message || "Failed to upload PDF. Check your network connection and backend URL."
      );
    } finally {
      setParsing(false);
      setLoadingMessage("");
    }
  };

  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setParsing(true);
      setLoadingMessage("Uploading image..."); // NEW

      const formData = new FormData();
      formData.append(
        "file",
        {
          uri: asset.uri,
          name: asset.fileName || "image.jpg",
          type: asset.mimeType || "image/jpeg",
        } as any
      );

      setLoadingMessage(aiRepair ? "Processing image with AI & OCR (30-60 seconds)..." : "Running OCR on image..."); // NEW

      const url = `${API_BASE}/assignments/image?preprocess=${encodeURIComponent(
        "screenshot"
      )}&use_llm=${String(aiRepair)}`;

      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          body: formData,
        },
        90000 // 90 second timeout
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as ApiResponse;

      if (json.status !== "ok") {
        Alert.alert("Upload failed", json.message || "Server error");
        return;
      }

      buildDraftsFromItems(json, json.items || []);
      setUploadOpen(false);
    } catch (e: any) {
      console.error("Image upload error:", e);
      Alert.alert(
        "Error",
        e?.message || "Failed to upload image. Check your network connection and backend URL."
      );
    } finally {
      setParsing(false);
      setLoadingMessage("");
    }
  };

  const handleParseText = async () => {
    if (!syllabusText.trim()) {
      Alert.alert(
        "Add some text",
        "Paste syllabus text before parsing."
      );
      return;
    }

    try {
      setParsing(true);
      setLoadingMessage("Parsing text..."); // NEW

      const res = await fetchWithTimeout(
        `${API_BASE}/assignments/text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: syllabusText }),
        },
        30000 // 30 second timeout for text
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as ApiResponse;

      if (json.status !== "ok") {
        Alert.alert("Parse failed", json.message || "Server error");
        return;
      }

      buildDraftsFromItems(json, json.items || []);
      setUploadOpen(false);
    } catch (e: any) {
      console.error("Text parse error:", e);
      Alert.alert(
        "Error",
        e?.message || "Failed to parse text. Check your network connection and backend URL."
      );
    } finally {
      setParsing(false);
      setLoadingMessage("");
    }
  };

  const handleSaveDrafts = () => {
    if (!drafts.length) {
      setDraftsOpen(false);
      return;
    }
    addAssignmentsFromDrafts(drafts);
    setDrafts([]);
    setDraftsOpen(false);
    onClose();
  };

  return (
    <>
      {/* Floating 3-option menu */}
      <View style={styles.overlay}>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.9}
            onPress={() => setUploadOpen(true)}
          >
            <Upload size={20} color="#111827" />
            <Text style={styles.menuText}>Upload Syllabus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.9}
            onPress={() => setAddClassOpen(true)}
          >
            <Folder size={20} color="#111827" />
            <Text style={styles.menuText}>Add Class</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.9}
            onPress={() => setAddAssignmentOpen(true)}
          >
            <FileText size={20} color="#111827" />
            <Text style={styles.menuText}>Add Assignment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========= Upload Syllabus sheet ========= */}
      <Modal
        visible={uploadOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Upload Syllabus</Text>
              <TouchableOpacity onPress={closeAll} disabled={parsing}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              Paste your syllabus text or upload a file. We'll
              extract assignments and due dates. Toggle AI Repair to
              let the model clean up messy dates.
            </Text>

            <View style={styles.aiRow}>
              <Switch
                value={aiRepair}
                onValueChange={setAiRepair}
                trackColor={{
                  false: "#E5E7EB",
                  true: "#7C3AED",
                }}
                thumbColor="#FFFFFF"
                disabled={parsing}
              />
              <Text style={styles.aiLabel}>AI Repair</Text>
            </View>

            <Text style={styles.label}>
              Course Name (optional — we'll try to detect it)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., CS 370"
              placeholderTextColor="#9CA3AF"
              value={courseName}
              onChangeText={setCourseName}
              editable={!parsing}
            />

            <Text style={styles.label}>Syllabus Text</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Paste syllabus text here…"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
              value={syllabusText}
              onChangeText={setSyllabusText}
              editable={!parsing}
            />

            <View style={styles.fileButtons}>
              <TouchableOpacity
                style={[styles.fileBtn, parsing && styles.fileBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleUploadPdf}
                disabled={parsing}
              >
                <View style={styles.fileIconCircle}>
                  <Paperclip size={18} color="#111827" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileTitle}>Upload PDF</Text>
                  <Text style={styles.fileSubtitle}>
                    Choose a PDF syllabus
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fileBtn, parsing && styles.fileBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleUploadImage}
                disabled={parsing}
              >
                <View style={styles.fileIconCircle}>
                  <ImageIcon size={18} color="#111827" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileTitle}>Upload Image</Text>
                  <Text style={styles.fileSubtitle}>
                    Use a screenshot or photo
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* NEW: Loading indicator with message */}
            {parsing && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.loadingText}>{loadingMessage}</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.9}
                onPress={closeAll}
                disabled={parsing}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, parsing && styles.primaryBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleParseText}
                disabled={parsing}
              >
                {parsing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryText}>
                    Parse Text
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========= Draft Editor ========= */}
      <DraftEditorModal
        visible={draftsOpen}
        drafts={drafts}
        onChangeDrafts={setDrafts}
        onClose={() => setDraftsOpen(false)}
        onStartOver={() => setDrafts([])}
        onSave={handleSaveDrafts}
      />

      {/* ========= Add Class placeholder ========= */}
      <Modal
        visible={addClassOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <View style={styles.simpleOverlay}>
          <View style={styles.simpleBox}>
            <Text style={styles.simpleTitle}>Add Class</Text>
            <Text style={styles.simpleText}>
              Later, this will let you create a class with a color and
              name. For now this is a placeholder.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={closeAll}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========= Add Assignment placeholder ========= */}
      <Modal
        visible={addAssignmentOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <View style={styles.simpleOverlay}>
          <View style={styles.simpleBox}>
            <Text style={styles.simpleTitle}>Add Assignment</Text>
            <Text style={styles.simpleText}>
              Later, this will let you manually enter a single
              assignment with a due date and class.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={closeAll}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 110,
    width: 240,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuText: {
    fontWeight: "600",
    color: "#111827",
    fontSize: 15,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sheetSub: {
    marginTop: 6,
    marginBottom: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    marginBottom: 10,
  },
  multiline: {
    height: 120,
  },
  fileButtons: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileBtnDisabled: {
    opacity: 0.5,
  },
  fileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  fileSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  loadingText: {
    flex: 1,
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    fontWeight: "700",
    color: "#111827",
  },
  primaryText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },

  simpleOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  simpleBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  simpleText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
});