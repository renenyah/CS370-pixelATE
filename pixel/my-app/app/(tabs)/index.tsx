import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  Home as HomeIcon,
  Clock,
  FolderOpenDot,
  UploadCloud,
  Plus,
  Calendar as CalIcon,
  Save,
  X,
  Trash2,
  ChevronRight,
} from "lucide-react-native";

/* ------------------------ Types & constants ------------------------ */
type Priority = "high" | "medium" | "low";

type Assignment = {
  id: string;                 // stable id
  title: string;
  course: string;
  type?: string;              // Assignment, Reading, Quiz, Test, etc.
  description?: string;
  dueDateISO: string;         // YYYY-MM-DD
};

type DueItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  page?: number | null;
  source?: string;
  course?: string;
  type?: string;
  description?: string;
};

type ApiResponse = {
  status: "ok" | "error";
  message?: string;
  items?: DueItem[];
  pdf_name?: string;
  image_name?: string;
  llm_used?: boolean;
  llm_error?: string | null;
};

const STORAGE_KEY = "assignments_v1";
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000")
  .replace(/\/+$/, "");

/* ------------------------ Small utilities ------------------------ */
const todayISO = new Date().toISOString().slice(0, 10);

function parseToISO(input?: string): string {
  if (!input) return "";
  // allow already-ISO, mm/dd/yyyy, Month day, year
  const trimmed = input.trim();

  // ISO-like
  const isoLike = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
  if (isoLike) {
    const d = new Date(trimmed);
    return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
  }

  // mm/dd/yyyy
  const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(trimmed);
  if (mdy) {
    const m = Number(mdy[1]);
    const d = Number(mdy[2]);
    const y = Number(mdy[3].length === 2 ? "20" + mdy[3] : mdy[3]);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return isNaN(+dt) ? "" : dt.toISOString().slice(0, 10);
  }

  const dt = new Date(trimmed);
  return isNaN(+dt) ? "" : dt.toISOString().slice(0, 10);
}

function isOverdue(iso: string) {
  return !!iso && iso < todayISO;
}
function isWithin7Days(iso: string) {
  if (!iso) return false;
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  return iso > todayISO && iso <= in7.toISOString().slice(0, 10);
}
function timeNow12h() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function loadAssignments(): Promise<Assignment[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Assignment[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
async function saveAssignments(arr: Assignment[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* ------------------------ Backend helpers ------------------------ */
function inferMimeFromName(name?: string, fallback = "application/octet-stream") {
  if (!name) return fallback;
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return fallback;
}
async function postFile(endpointPath: string, file: { uri: string; name: string; type: string }) {
  const fd = new FormData();
  fd.append("file", { uri: file.uri, name: file.name, type: file.type } as any);
  const res = await fetch(`${API_BASE}${endpointPath}`, { method: "POST", body: fd });
  return (await res.json()) as ApiResponse;
}
async function postText(text: string) {
  const res = await fetch(`${API_BASE}/assignments/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return (await res.json()) as ApiResponse;
}

/* ------------------------ Component ------------------------ */
export default function HomeScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [aiRepair, setAiRepair] = useState<boolean>(false);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [courseHint, setCourseHint] = useState("");
  const [syllabusText, setSyllabusText] = useState("");

  // Review/Edit modal
  type Editable = {
    key: string;
    title: string;
    course: string;
    type: string;
    description: string;
    dueDateISO: string;
  };
  const [toReview, setToReview] = useState<Editable[] | null>(null);

  // class filter on Home "Today's Assignments"
  const [activeCourse, setActiveCourse] = useState<string>("__ALL__");

  /* Load persisted data once */
  useEffect(() => {
    loadAssignments().then(setAssignments);
  }, []);

  /* Derived sets */
  const classList = useMemo(() => {
    const s = new Set<string>();
    assignments.forEach((a) => a.course && s.add(a.course));
    return Array.from(s).sort();
  }, [assignments]);

  const dueToday = useMemo(
    () => assignments.filter((a) => a.dueDateISO === todayISO),
    [assignments]
  );

  const dueTodayVisible = useMemo(() => {
    if (activeCourse === "__ALL__") return dueToday;
    return dueToday.filter((a) => a.course === activeCourse);
  }, [dueToday, activeCourse]);

  const upcomingCount = useMemo(
    () => assignments.filter((a) => isWithin7Days(a.dueDateISO)).length,
    [assignments]
  );
  const overdueCount = useMemo(
    () => assignments.filter((a) => isOverdue(a.dueDateISO)).length,
    [assignments]
  );

  /* ---------------- Upload & Parse ---------------- */
  function openUpload() {
    setCourseHint("");
    setSyllabusText("");
    setToReview(null);
    setUploadOpen(true);
  }
  function closeUpload() {
    setUploadOpen(false);
    setToReview(null);
  }

  async function pickPdfOrDoc() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const a = result.assets[0];
    const file = {
      uri: a.uri,
      name: a.name || `upload_${Date.now()}`,
      type: a.mimeType || inferMimeFromName(a.name),
    };

    const endpoint =
      file.type.startsWith("image/")
        ? `/assignments/image?preprocess=screenshot&use_llm=${String(aiRepair)}`
        : `/assignments/pdf?use_llm=${String(aiRepair)}`;

    const resp = await postFile(endpoint, file);
    if (resp.status !== "ok") {
      Alert.alert("Upload failed", resp.message || "Server error.");
      return;
    }
    const items = (resp.items || []).map((it, idx): Editable => ({
      key: `${(it.course || courseHint || "Course").trim()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      title: it.title || "Untitled",
      course: (it.course || courseHint || "").trim(),
      type: it.type || "Assignment",
      description: it.description || "",
      dueDateISO: parseToISO(it.due_date_iso || it.due_date_raw) || "",
    }));
    if (!items.length) {
      Alert.alert("No assignments found", "Try a different file or enable AI Repair.");
      return;
    }
    setToReview(items);
  }

  async function pickImageFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0] as any;
    const file = {
      uri: asset.uri,
      name: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.type || "image/jpeg",
    };
    const resp = await postFile(
      `/assignments/image?preprocess=screenshot&use_llm=${String(aiRepair)}`,
      file
    );
    if (resp.status !== "ok") {
      Alert.alert("Upload failed", resp.message || "Server error.");
      return;
    }
    const items = (resp.items || []).map((it, idx): Editable => ({
      key: `${(it.course || courseHint || "Course").trim()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      title: it.title || "Untitled",
      course: (it.course || courseHint || "").trim(),
      type: it.type || "Assignment",
      description: it.description || "",
      dueDateISO: parseToISO(it.due_date_iso || it.due_date_raw) || "",
    }));
    if (!items.length) {
      Alert.alert("No assignments found", "Try a clearer image or enable AI Repair.");
      return;
    }
    setToReview(items);
  }

  async function parseText() {
    if (!syllabusText.trim()) {
      Alert.alert("Paste needed", "Paste text or upload a file/image.");
      return;
    }
    const resp = await postText(syllabusText);
    if (resp.status !== "ok") {
      Alert.alert("Parse failed", resp.message || "Server error.");
      return;
    }
    const items = (resp.items || []).map((it, idx): Editable => ({
      key: `${(it.course || courseHint || "Course").trim()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      title: it.title || "Untitled",
      course: (it.course || courseHint || "").trim(),
      type: it.type || "Assignment",
      description: it.description || "",
      dueDateISO: parseToISO(it.due_date_iso || it.due_date_raw) || "",
    }));
    if (!items.length) {
      Alert.alert("No assignments found", "Try different text or enable AI Repair.");
      return;
    }
    setToReview(items);
  }

  function updateEditable(idx: number, patch: Partial<Editable>) {
    if (!toReview) return;
    const copy = [...toReview];
    copy[idx] = { ...copy[idx], ...patch };
    setToReview(copy);
  }
  function deleteEditable(idx: number) {
    if (!toReview) return;
    const copy = [...toReview];
    copy.splice(idx, 1);
    setToReview(copy.length ? copy : null);
  }

  async function startOver() {
    setToReview(null);
    setSyllabusText("");
    setCourseHint("");
  }

  async function saveAllFromReview() {
    if (!toReview || !toReview.length) {
      Alert.alert("Nothing to save", "Add or parse items first.");
      return;
    }
    const now = Date.now();
    const newOnes: Assignment[] = toReview.map((e, i) => ({
      id: `${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      title: e.title.trim() || "Untitled",
      course: e.course.trim(),
      type: e.type || "Assignment",
      description: e.description || "",
      dueDateISO: e.dueDateISO || "",
    }));
    const merged = [...assignments, ...newOnes];
    setAssignments(merged);
    await saveAssignments(merged);
    setToReview(null);
    setUploadOpen(false);
    Alert.alert("Saved", `${newOnes.length} assignment(s) saved.`);
  }

  /* ------------------------ UI ------------------------ */
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Welcome! 📚</Text>
          <Text style={s.subtitle}>
            {timeNow12h()} • {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Stats */}
        <View style={s.cardRow}>
          <View style={s.statCard}>
            <View style={s.statIconWrapBlue}><Clock size={18} color="#4f46e5" /></View>
            <Text style={s.statLabel}>Upcoming (Next 7 Days)</Text>
            <Text style={[s.statNumber, { color: "#4f46e5" }]}>{upcomingCount}</Text>
          </View>
          <View style={s.statCard}>
            <View style={s.statIconWrapRed}><Clock size={18} color="#ef4444" /></View>
            <Text style={s.statLabel}>Overdue</Text>
            <Text style={[s.statNumber, { color: "#ef4444" }]}>{overdueCount}</Text>
          </View>
        </View>

        {/* Today */}
        <View style={s.block}>
          <Text style={s.blockTitle}>Today’s Assignments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <TouchableOpacity
              onPress={() => setActiveCourse("__ALL__")}
              style={[s.chip, activeCourse === "__ALL__" && s.chipActive]}
            >
              <Text style={[s.chipText, activeCourse === "__ALL__" && s.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {classList.map((c) => (
              <TouchableOpacity
                key={`pill-${c}`}
                onPress={() => setActiveCourse(c)}
                style={[s.chip, activeCourse === c && s.chipActive]}
              >
                <Text
                  numberOfLines={1}
                  style={[s.chipText, activeCourse === c && s.chipTextActive]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {dueTodayVisible.length === 0 ? (
            <Text style={s.empty}>No assignments due today 🎉</Text>
          ) : (
            dueTodayVisible
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((a) => (
                <View key={a.id} style={s.itemCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={s.itemIcon}><FolderOpenDot size={18} color="#6b7280" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={s.itemMeta}>{a.course || "Uncategorized"} • {a.type || "Assignment"}</Text>
                    </View>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* FAB actions (uses the + in tab bar visually, but here we provide the same action) */}
        <View style={{ marginTop: 24, alignItems: "center" }}>
          <TouchableOpacity onPress={openUpload} style={s.bigAction}>
            <UploadCloud size={20} color="#111827" />
            <Text style={s.bigActionText}>Upload Syllabus</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal visible={uploadOpen} animationType="slide" transparent onRequestClose={closeUpload}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Upload Syllabus</Text>
              <TouchableOpacity onPress={closeUpload}><X size={24} color="#111827" /></TouchableOpacity>
            </View>

            {toReview ? (
              <>
                {/* REVIEW & EDIT */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
                  <TouchableOpacity style={s.secondaryBtn} onPress={startOver}>
                    <Text style={s.secondaryBtnText}>Start Over</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }}>
                  {toReview.map((e, idx) => (
                    <View key={e.key} style={s.editCard}>
                      <Text style={s.editLabel}>Title</Text>
                      <TextInput
                        style={s.input}
                        value={e.title}
                        onChangeText={(v) => updateEditable(idx, { title: v })}
                        placeholder="e.g., Quiz 2 due 11:59pm"
                        placeholderTextColor="#9ca3af"
                      />

                      <View style={s.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={s.editLabel}>Course</Text>
                          <TextInput
                            style={s.input}
                            value={e.course}
                            onChangeText={(v) => updateEditable(idx, { course: v })}
                            placeholder="e.g., CS 326"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={s.editLabel}>Type</Text>
                          <TextInput
                            style={s.input}
                            value={e.type}
                            onChangeText={(v) => updateEditable(idx, { type: v })}
                            placeholder="Assignment, Reading, Quiz, Test..."
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      </View>

                      <View>
                        <Text style={s.editLabel}>Due Date (MM/DD/YYYY)</Text>
                        <TextInput
                          style={s.input}
                          value={
                            e.dueDateISO
                              ? new Date(e.dueDateISO).toLocaleDateString()
                              : ""
                          }
                          onChangeText={(v) =>
                            updateEditable(idx, { dueDateISO: parseToISO(v) })
                          }
                          placeholder="11/09/2025"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <Text style={s.editLabel}>Description (optional)</Text>
                      <TextInput
                        style={[s.input, { height: 80 }]}
                        value={e.description}
                        onChangeText={(v) => updateEditable(idx, { description: v })}
                        placeholder="Short note…"
                        placeholderTextColor="#9ca3af"
                        multiline
                      />

                      <TouchableOpacity
                        style={s.deleteBtn}
                        onPress={() => deleteEditable(idx)}
                      >
                        <Trash2 size={16} color="#fff" />
                        <Text style={s.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={s.primaryBtn} onPress={saveAllFromReview}>
                  <Save size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Save All</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* INPUTS to PARSE */}
                <View style={s.rowBetween}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={s.aiLabel}>AI Repair</Text>
                    <TouchableOpacity
                      style={[s.toggle, aiRepair && s.toggleOn]}
                      onPress={() => setAiRepair((p) => !p)}
                    >
                      <View style={[s.knob, aiRepair && s.knobOn]} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={startOver} style={s.secondaryBtn}>
                    <Text style={s.secondaryBtnText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.editLabel}>Course Name (optional)</Text>
                <TextInput
                  style={s.input}
                  value={courseHint}
                  onChangeText={setCourseHint}
                  placeholder="e.g., Computer Science 101"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={s.editLabel}>Syllabus Text</Text>
                <TextInput
                  style={[s.input, { height: 140 }]}
                  value={syllabusText}
                  onChangeText={setSyllabusText}
                  multiline
                  placeholder="Paste syllabus text here…"
                  placeholderTextColor="#9ca3af"
                />

                <View style={[s.row, { marginTop: 8, gap: 8 }]}>
                  <TouchableOpacity style={s.secondaryBtn} onPress={pickPdfOrDoc}>
                    <UploadCloud size={16} color="#111827" />
                    <Text style={s.secondaryBtnText}>Upload PDF / Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.primaryBtn} onPress={parseText}>
                    <CalIcon size={16} color="#fff" />
                    <Text style={s.primaryBtnText}>Parse Syllabus</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------ Styles ------------------------ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  header: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: "800", color: "#111827" },
  subtitle: { color: "#6b7280", marginTop: 6 },

  cardRow: { flexDirection: "row", gap: 14, paddingHorizontal: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statIconWrapBlue: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  statIconWrapRed: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  statLabel: { marginTop: 8, color: "#374151" },
  statNumber: { marginTop: 6, fontSize: 28, fontWeight: "800" },

  block: { marginTop: 20, marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  blockTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },

  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: "#f3f4f6", marginRight: 8 },
  chipActive: { backgroundColor: "#e9d5ff" },
  chipText: { color: "#111827" },
  chipTextActive: { fontWeight: "700", color: "#4c1d95" },

  empty: { color: "#6b7280", marginTop: 8 },

  itemCard: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: "#f9fafb" },
  itemIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemTitle: { fontWeight: "700", color: "#111827" },
  itemMeta: { color: "#6b7280", marginTop: 2 },

  bigAction: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10 },
  bigActionText: { fontWeight: "700", color: "#111827" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 18 },
  modal: { width: "100%", maxWidth: 700, backgroundColor: "#fff", borderRadius: 20, padding: 18, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },

  aiLabel: { fontWeight: "700", color: "#111827" },
  toggle: { width: 52, height: 30, borderRadius: 999, backgroundColor: "#d1d5db", padding: 2 },
  toggleOn: { backgroundColor: "#8b5cf6" },
  knob: { width: 26, height: 26, borderRadius: 999, backgroundColor: "#fff" },
  knobOn: { transform: [{ translateX: 22 }] },

  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f9fafb", color: "#111827", marginBottom: 10 },

  primaryBtn: { marginTop: 10, backgroundColor: "#7c3aed", paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: { backgroundColor: "#eef2ff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  secondaryBtnText: { color: "#111827", fontWeight: "700" },

  editCard: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#f3f4f6" },
  editLabel: { color: "#374151", fontWeight: "700", marginBottom: 6 },

  deleteBtn: { marginTop: 6, backgroundColor: "#ef4444", borderRadius: 10, paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  deleteBtnText: { color: "#fff", fontWeight: "700" },
});
