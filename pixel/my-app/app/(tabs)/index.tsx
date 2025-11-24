<<<<<<< HEAD
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
=======
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import {
  Home as HomeIcon,
  BookOpen,
  Calendar as CalendarIcon,
  User as UserIcon,
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Save,
  RotateCcw,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Search,
  Paperclip,
} from 'lucide-react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

/* =========================
   Types
   ========================= */
type Priority = 'high' | 'medium' | 'low';
type TabKey = 'home' | 'classes' | 'calendar' | 'profile';

type FileAttachment = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

type Assignment = {
  id: number;
  icon: string;
  title: string;
  course: string;
  type: string;
  dueDate: string;   // ISO yyyy-mm-dd or 'MM/DD/YYYY' we normalize internally
  dueTime?: string;  // optional
  priority: Priority;
  attachments?: FileAttachment[];
>>>>>>> parent of 8156aa39 (more changes)
};

type DueItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  page?: number | null;
  source?: string;
  course?: string;
<<<<<<< HEAD
  type?: string;
  description?: string;
=======
>>>>>>> parent of 8156aa39 (more changes)
};

type ApiResponse = {
  status: 'ok' | 'error';
  message?: string;
  pdf_name?: string;
  image_name?: string;
  items?: DueItem[];
  llm_used?: boolean;
  llm_error?: string | null;
};

<<<<<<< HEAD
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
=======
/* =========================
   Backend config
   ========================= */
// IMPORTANT: set EXPO_PUBLIC_API_BASE in your .env to your laptop IP (e.g. http://192.168.1.23:8000)
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://10.44.180.114:8000').replace(/\/+$/, '');
const IMG_PREPROCESS = 'adaptive'; // passed to /assignments/image

/* =========================
   Date helpers (safe, no toISOString crash)
   ========================= */
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toISODateLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Accepts many forms, returns ISO yyyy-mm-dd or '' if invalid
function parseToISO(input?: string): string {
  if (!input) return '';
  const s = input.trim();

  // MM/DD/YYYY
  const mdy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
  const ymd = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;

  if (mdy.test(s)) {
    const [, m, d, y] = s.match(mdy)!;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt.getTime()) ? '' : toISODateLocal(dt);
  }
  if (ymd.test(s)) {
    const [, y, m, d] = s.match(ymd)!;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt.getTime()) ? '' : toISODateLocal(dt);
  }

  // Fallback to Date parsing
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? '' : toISODateLocal(dt);
}

function isSameLocalDay(isoA: string, isoB: string) {
  return isoA && isoB && isoA.slice(0, 10) === isoB.slice(0, 10);
}

function isOverdue(iso: string) {
  if (!iso) return false;
  const today = toISODateLocal(new Date());
  return iso < today;
}

function isWithin7Days(iso: string) {
  if (!iso) return false;
  const now = new Date();
  const target = new Date(iso);
  if (isNaN(target.getTime())) return false;
  const diffDays = Math.floor((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

/* =========================
   Upload helpers
   ========================= */
function inferMimeFromName(name?: string, fallback = 'application/octet-stream') {
  if (!name) return fallback;
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.heic')) return 'image/heic';
  return fallback;
}

async function postFile(
  endpointPath: string,
  file: { uri: string; name: string; type: string }
): Promise<ApiResponse> {
  const url = `${API_BASE}${endpointPath}`;
  const fd = new FormData();
  fd.append('file', file as any);
  const res = await fetch(url, { method: 'POST', body: fd });
  let json: ApiResponse;
  try {
    json = (await res.json()) as ApiResponse;
  } catch {
    json = { status: 'error', message: `HTTP ${res.status}` };
  }
  return json;
>>>>>>> parent of 8156aa39 (more changes)
}
async function postText(text: string) {
  const res = await fetch(`${API_BASE}/assignments/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  let json: ApiResponse;
  try {
    json = (await res.json()) as ApiResponse;
  } catch {
    json = { status: 'error', message: `HTTP ${res.status}` };
  }
  return json;
}

<<<<<<< HEAD
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
=======
/* =========================
   Small components
   ========================= */
const StatCard = ({ title, value, accent = '#6d28d9' }: { title: string; value: number; accent?: string }) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Clock size={16} color="#64748b" />
      <Text style={styles.statTitle}>{title}</Text>
    </View>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
  </View>
);

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ClassFolder = ({
  course,
  overdue,
  upcoming,
  onPress,
}: {
  course: string;
  overdue: number;
  upcoming: number;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.folderCard}>
    <View style={styles.folderHeader}>
      <Text style={styles.folderTitle}>{course}</Text>
    </View>
    <View style={styles.folderStats}>
      <View style={styles.folderPill}>
        <AlertCircle size={14} color="#ef4444" />
        <Text style={styles.folderPillText}>{overdue} overdue</Text>
      </View>
      <View style={[styles.folderPill, { backgroundColor: '#eef2ff' }]}>
        <Clock size={14} color="#6366f1" />
        <Text style={[styles.folderPillText, { color: '#4338ca' }]}>{upcoming} upcoming</Text>
      </View>
    </View>
  </TouchableOpacity>
);

/* =========================
   Main
   ========================= */
export default function HomeScreen() {
  /* ---- global UI ---- */
  const [tab, setTab] = useState<TabKey>('home');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [nextId, setNextId] = useState(1);

  /* ---- “+” menu & Upload Modals ---- */
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [aiRepair, setAiRepair] = useState(false);
  const [courseHint, setCourseHint] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [pickedFile, setPickedFile] = useState<FileAttachment | null>(null);

  const [parseBusy, setParseBusy] = useState(false);
  const [reviewItems, setReviewItems] = useState<
    {
      tmpId: string;
      title: string;
      course: string;
      type: string;
      dueDate: string; // shown as MM/DD/YYYY in editor; stored ISO on save
      description?: string;
    }[]
  >([]);
  const [openTypeFor, setOpenTypeFor] = useState<string | null>(null); // dropdown control

  /* ---- calendar/profile placeholders ---- */
  const [selectedCourseForClassView, setSelectedCourseForClassView] = useState<string | null>(null);

  /* ---- derived ---- */
  const todayISO = toISODateLocal(new Date());

  const assignmentsToday = useMemo(
    () =>
      assignments.filter((a) => {
        const iso = parseToISO(a.dueDate);
        return isSameLocalDay(iso, todayISO);
      }),
    [assignments, todayISO]
  );

  const upcomingCount = useMemo(
    () => assignments.filter((a) => isWithin7Days(parseToISO(a.dueDate))).length,
>>>>>>> parent of 8156aa39 (more changes)
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
<<<<<<< HEAD
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
=======
    () => assignments.filter((a) => isOverdue(parseToISO(a.dueDate))).length,
    [assignments]
  );

  const courseList = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => a.course && set.add(a.course));
    return Array.from(set);
  }, [assignments]);

  const itemsByCourse: Record<string, Assignment[]> = useMemo(() => {
    const m: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
      const k = a.course || 'Uncategorized';
      if (!m[k]) m[k] = [];
      m[k].push(a);
    });
    return m;
  }, [assignments]);

  /* =========================
     Header helpers
     ========================= */
  const now = new Date();
  const friendlyTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const friendlyDate = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  /* =========================
     Picker actions
     ========================= */
  const pickPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setPickedFile({
        uri: a.uri,
        name: a.name || `syllabus_${Date.now()}.pdf`,
        type: a.mimeType || 'application/pdf',
        size: a.size || 0,
      });
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 1,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a: any = res.assets[0];
      setPickedFile({
        uri: a.uri,
        name: a.fileName || `syllabus_${Date.now()}.jpg`,
        type: a.type || inferMimeFromName(a.fileName, 'image/jpeg'),
        size: a.fileSize || 0,
      });
    }
  };

  /* =========================
     Parse syllabus → open review
     ========================= */
  const handleParse = async () => {
    try {
      if (parseBusy) return;
      setParseBusy(true);

      let resp: ApiResponse | null = null;

      if (pickedFile) {
        if ((pickedFile.type || '').startsWith('image/')) {
          resp = await postFile(`/assignments/image?preprocess=${encodeURIComponent(IMG_PREPROCESS)}&use_llm=${aiRepair}`, {
            uri: pickedFile.uri,
            name: pickedFile.name,
            type: pickedFile.type,
          });
        } else {
          resp = await postFile(`/assignments/pdf?use_llm=${aiRepair}`, {
            uri: pickedFile.uri,
            name: pickedFile.name,
            type: pickedFile.type || 'application/pdf',
          });
        }
      } else if (syllabusText.trim().length > 0) {
        // plain text route
        resp = await postText(syllabusText);
      } else {
        Alert.alert('Upload or Paste Required', 'Please paste syllabus text or upload a PDF / image.');
        return;
      }

      if (!resp) {
        Alert.alert('Error', 'No response from server.');
        return;
      }
      if (resp.status !== 'ok') {
        Alert.alert('Parse failed', resp.message || 'Server error.');
        return;
      }

      const mapped =
        (resp.items || []).map((it, i) => {
          const raw = it.due_date_iso || it.due_date_raw || '';
          const iso = parseToISO(raw);
          // Editor uses MM/DD/YYYY for clarity; convert ISO to that format if we have it
          let displayDate = '';
          if (iso) {
            const d = new Date(iso);
            displayDate = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
          }
          return {
            tmpId: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
            title: it.title || 'Untitled',
            course: it.course || courseHint,
            type: 'Assignment',
            dueDate: displayDate,
            description: '',
          };
        }) ?? [];

      if (mapped.length === 0) {
        Alert.alert('No assignments found', 'Try a clearer file or toggle AI Repair.');
        return;
      }

      setReviewItems(mapped);
      setUploadOpen(false);
      setReviewOpen(true);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setParseBusy(false);
    }
  };

  const resetUpload = () => {
    setCourseHint('');
    setSyllabusText('');
    setPickedFile(null);
    setOpenTypeFor(null);
  };

  /* =========================
     Save all from review
     ========================= */
  const saveAllReviewed = () => {
    if (reviewItems.length === 0) {
      setReviewOpen(false);
      return;
    }

    const newOnes: Assignment[] = reviewItems.map((r) => {
      const iso = parseToISO(r.dueDate);
      const dt = iso || ''; // keep empty if invalid; UI won’t crash
      const pr: Priority = isSameLocalDay(dt, todayISO)
        ? 'high'
        : isWithin7Days(dt)
        ? 'medium'
        : 'low';

      const id = nextId + 1;
      setNextId(id);

      return {
        id,
        icon: '📝',
        title: r.title.trim() || 'Untitled',
        course: r.course.trim() || 'Uncategorized',
        type: r.type || 'Assignment',
        dueDate: dt,
        priority: pr,
      };
    });

    setAssignments((prev) => [...prev, ...newOnes]);
    setReviewOpen(false);
    setMenuOpen(false);
    resetUpload();
  };

  /* =========================
     UI renderers
     ========================= */
  const renderHome = () => {
    const filterCourse = selectedCourseForClassView; // optional future filter

    const todays = assignmentsToday.filter((a) => !filterCourse || a.course === filterCourse);
    const classes = Array.from(new Set(assignments.map((a) => a.course).filter(Boolean)));

    return (
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.h1}>Welcome! 📚</Text>
          <Text style={styles.h2}>
            {friendlyTime} • {friendlyDate}
>>>>>>> parent of 8156aa39 (more changes)
          </Text>
        </View>

        {/* Stats */}
<<<<<<< HEAD
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
=======
        <View style={styles.statRow}>
          <StatCard title="Upcoming (Next 7 Days)" value={upcomingCount} accent="#4f46e5" />
          <StatCard title="Overdue" value={overdueCount} accent="#ef4444" />
        </View>

        {/* Today’s section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today’s Assignments</Text>

          {/* Class filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
            <Chip label="All" active={!selectedCourseForClassView} onPress={() => setSelectedCourseForClassView(null)} />
            {classes.map((c, i) => (
              <Chip
                key={`${c}-${i}`}
                label={c}
                active={selectedCourseForClassView === c}
                onPress={() => setSelectedCourseForClassView(c)}
              />
            ))}
          </ScrollView>

          {todays.length === 0 ? (
            <Text style={styles.dimText}>No assignments due today 🎉</Text>
          ) : (
            todays.map((a) => (
              <View key={a.id} style={styles.todayItem}>
                <View style={styles.todayLeft}>
                  <Text style={styles.todayEmoji}>{a.icon}</Text>
                  <View>
                    <Text style={styles.todayTitle}>{a.title}</Text>
                    <Text style={styles.todaySub}>{a.course || 'Uncategorized'}</Text>
                  </View>
                </View>
                <View style={[styles.badge, a.priority === 'high' ? styles.badgeHigh : a.priority === 'medium' ? styles.badgeMed : styles.badgeLow]}>
                  <Text style={styles.badgeText}>
                    {a.priority === 'high' ? 'High' : a.priority === 'medium' ? 'Medium' : 'Low'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderClasses = () => {
    const entries = Object.entries(itemsByCourse);

    return (
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.headerCompact}>
          <Text style={styles.h1Small}>Classes</Text>
          <Text style={styles.h2}>{friendlyDate}</Text>
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.dimText}>No classes yet — upload a syllabus to get started.</Text>
          </View>
        ) : (
          <View style={styles.folderGrid}>
            {entries.map(([courseName, items], idx) => {
              const o = items.filter((a) => isOverdue(parseToISO(a.dueDate))).length;
              const u = items.filter((a) => isWithin7Days(parseToISO(a.dueDate))).length;
              return (
                <ClassFolder
                  key={`${courseName}-${idx}`}
                  course={courseName}
                  overdue={o}
                  upcoming={u}
                  onPress={() => {
                    setSelectedCourseForClassView(courseName);
                    setTab('home'); // jump to Home to see “Today” filtered by course via chips if desired
                  }}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderCalendar = () => (
    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerCompact}>
        <Text style={styles.h1Small}>Calendar</Text>
        <Text style={styles.h2}>{friendlyDate}</Text>
      </View>

      {/* Very simple grouped view by date (placeholder for full calendar grid) */}
      {Object.entries(
        assignments.reduce<Record<string, Assignment[]>>((acc, a) => {
          const iso = parseToISO(a.dueDate) || 'Unknown';
          if (!acc[iso]) acc[iso] = [];
          acc[iso].push(a);
          return acc;
        }, {})
      )
        .sort(([d1], [d2]) => d1.localeCompare(d2))
        .map(([iso, arr]) => (
          <View key={iso} style={styles.card}>
            <Text style={styles.sectionTitle}>{iso === 'Unknown' ? 'Unknown Date' : iso}</Text>
            {arr.map((a) => (
              <View key={`${a.id}-cal`} style={styles.calendarRow}>
                <Text style={styles.calendarCourse}>{a.course}</Text>
                <Text numberOfLines={1} style={styles.calendarTitle}>
                  {a.title}
                </Text>
                {isOverdue(parseToISO(a.dueDate)) && <Text style={styles.calendarOverdue}>OVERDUE</Text>}
              </View>
            ))}
          </View>
        ))}
    </ScrollView>
  );

  const renderProfile = () => {
    const [first, last] = ['', '']; // for now empty
    const initials = (first?.[0] || '') + (last?.[0] || '');

    return (
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.headerCompact}>
          <Text style={styles.h1Small}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{(initials || 'ST').toUpperCase()}</Text>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.inputLabel}>Student Name</Text>
              <TextInput placeholder="Your name" style={styles.input} defaultValue="" />
            </View>
            <View>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput placeholder="your.email@university.edu" style={styles.input} keyboardType="email-address" defaultValue="" />
            </View>
            <View>
              <Text style={styles.inputLabel}>Change Password</Text>
              <TextInput placeholder="••••••••" secureTextEntry style={styles.input} defaultValue="" />
            </View>
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Save Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  /* =========================
     Main return
     ========================= */
  return (
    <View style={styles.container}>
      {/* Content */}
      {tab === 'home' && renderHome()}
      {tab === 'classes' && renderClasses()}
      {tab === 'calendar' && renderCalendar()}
      {tab === 'profile' && renderProfile()}

      {/* Floating + */}
      <View style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={() => setMenuOpen((v) => !v)}>
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* + Menu */}
      {menuOpen && (
        <View style={styles.plusMenu}>
          <TouchableOpacity
            style={styles.plusItem}
            onPress={() => {
              setUploadOpen(true);
              setMenuOpen(false);
            }}
          >
            <Upload size={18} color="#6d28d9" />
            <Text style={styles.plusText}>Upload Syllabus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plusItem}
            onPress={() => Alert.alert('Add Class', 'Class creation UI can go here.')}
          >
            <BookOpen size={18} color="#6d28d9" />
            <Text style={styles.plusText}>Add Class</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.plusItem}
            onPress={() => Alert.alert('Add Assignment', 'Manual assignment form can go here.')}
          >
            <FileText size={18} color="#6d28d9" />
            <Text style={styles.plusText}>Add Assignment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Modal (Step 1) */}
      <Modal visible={uploadOpen} transparent animationType="fade" onRequestClose={() => setUploadOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Syllabus</Text>
              <TouchableOpacity onPress={() => setUploadOpen(false)}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Paste syllabus text or upload a PDF / image. We’ll extract assignment names and due dates automatically.
            </Text>

            <View style={styles.rowBetween}>
              <View style={styles.aiToggle}>
                <Text style={styles.inputLabel}>AI Repair</Text>
                <Switch value={aiRepair} onValueChange={setAiRepair} />
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.inputLabel}>Course Name (optional — we’ll try to detect it)</Text>
              <TextInput
                value={courseHint}
                onChangeText={setCourseHint}
                placeholder="e.g., Computer Science 101"
                style={styles.input}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.inputLabel}>Syllabus Text</Text>
              <TextInput
                value={syllabusText}
                onChangeText={setSyllabusText}
                placeholder="Paste your syllabus text here… Include assignment names and due dates."
                multiline
                style={[styles.input, { height: 120 }]}
              />
            </View>

            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.outlineBtn} onPress={pickPDF}>
                <FileText size={18} color="#6d28d9" />
                <Text style={styles.outlineBtnText}>Upload PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlineBtn} onPress={pickImage}>
                <ImageIcon size={18} color="#6d28d9" />
                <Text style={styles.outlineBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>

            {pickedFile && (
              <View style={styles.fileBadge}>
                <Paperclip size={16} color="#6d28d9" />
                <Text style={styles.fileBadgeText} numberOfLines={1}>
                  {pickedFile.name}
                </Text>
                <TouchableOpacity onPress={() => setPickedFile(null)} style={{ padding: 4 }}>
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setUploadOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleParse} disabled={parseBusy}>
                <Text style={styles.primaryBtnText}>{parseBusy ? 'Parsing…' : 'Parse Syllabus'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Review Modal (Step 2) */}
      <Modal visible={reviewOpen} transparent animationType="fade" onRequestClose={() => setReviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Syllabus</Text>
              <TouchableOpacity
                onPress={() => {
                  setReviewOpen(false);
                }}
              >
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Found {reviewItems.length} assignment{reviewItems.length === 1 ? '' : 's'}.
            </Text>

            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {reviewItems.map((it, idx) => (
                <View key={it.tmpId} style={styles.editBlock}>
                  <View style={styles.editRow}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.input}
                      value={it.title}
                      onChangeText={(v) =>
                        setReviewItems((arr) => {
                          const copy = [...arr];
                          copy[idx] = { ...copy[idx], title: v };
                          return copy;
                        })
                      }
                      placeholder="Assignment title"
                    />
                  </View>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Course</Text>
                      <TextInput
                        style={styles.input}
                        value={it.course}
                        onChangeText={(v) =>
                          setReviewItems((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], course: v };
                            return copy;
                          })
                        }
                        placeholder="e.g., CS 326"
                      />
                    </View>

                    <View style={{ width: 12 }} />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Type</Text>
                      <TouchableOpacity
                        style={styles.select}
                        onPress={() => setOpenTypeFor((cur) => (cur === it.tmpId ? null : it.tmpId))}
                      >
                        <Text style={styles.selectText}>{it.type}</Text>
                        {openTypeFor === it.tmpId ? <ChevronUp size={18} color="#111827" /> : <ChevronDown size={18} color="#111827" />}
                      </TouchableOpacity>

                      {openTypeFor === it.tmpId && (
                        <View style={styles.selectMenu}>
                          {['Assignment', 'Discussion', 'Reading', 'Quiz', 'Test', 'Lab', 'Project', 'Presentation', 'Art', 'Other'].map(
                            (opt) => (
                              <TouchableOpacity
                                key={`${it.tmpId}-${opt}`}
                                style={styles.selectItem}
                                onPress={() => {
                                  setReviewItems((arr) => {
                                    const copy = [...arr];
                                    copy[idx] = { ...copy[idx], type: opt };
                                    return copy;
                                  });
                                  setOpenTypeFor(null);
                                }}
                              >
                                <Text style={styles.selectItemText}>{opt}</Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Due Date</Text>
                      <TextInput
                        style={styles.input}
                        value={it.dueDate}
                        onChangeText={(v) =>
                          setReviewItems((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], dueDate: v };
                            return copy;
                          })
                        }
                        placeholder="MM/DD/YYYY"
                        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Description (optional)</Text>
                      <TextInput
                        style={styles.input}
                        value={it.description || ''}
                        onChangeText={(v) =>
                          setReviewItems((arr) => {
                            const copy = [...arr];
                            copy[idx] = { ...copy[idx], description: v };
                            return copy;
                          })
                        }
                        placeholder="Details…"
                      />
                    </View>
                  </View>

                  <View style={styles.editActionsRow}>
                    <TouchableOpacity
                      style={styles.iconDanger}
                      onPress={() =>
                        setReviewItems((arr) => arr.filter((x) => x.tmpId !== it.tmpId))
                      }
                    >
                      <Trash2 size={18} color="#ef4444" />
                      <Text style={styles.iconDangerText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.reviewFooter}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  // Start over: go back to step 1 with cleared inputs
                  setReviewOpen(false);
                  setUploadOpen(true);
                  setReviewItems([]);
                  resetUpload();
                }}
              >
                <RotateCcw size={18} color="#111827" />
                <Text style={styles.secondaryBtnText}>Start Over</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={saveAllReviewed}>
                <Save size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Save All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setTab('home')}>
          <HomeIcon size={22} color={tab === 'home' ? '#a78bfa' : '#cbd5e1'} />
          <Text style={[styles.navText, tab === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setTab('classes')}>
          <BookOpen size={22} color={tab === 'classes' ? '#a78bfa' : '#cbd5e1'} />
          <Text style={[styles.navText, tab === 'classes' && styles.navTextActive]}>Classes</Text>
        </TouchableOpacity>

        <View style={{ width: 72 }} />{/* space for FAB */}

        <TouchableOpacity style={styles.navItem} onPress={() => setTab('calendar')}>
          <CalendarIcon size={22} color={tab === 'calendar' ? '#a78bfa' : '#cbd5e1'} />
          <Text style={[styles.navText, tab === 'calendar' && styles.navTextActive]}>Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setTab('profile')}>
          <UserIcon size={22} color={tab === 'profile' ? '#a78bfa' : '#cbd5e1'} />
          <Text style={[styles.navText, tab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
>>>>>>> parent of 8156aa39 (more changes)
    </View>
  );
}

<<<<<<< HEAD
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
=======
/* =========================
   Styles
   ========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  header: { marginBottom: 12 },
  headerCompact: { marginBottom: 4 },
  h1: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  h1Small: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  h2: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  statRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statTitle: { color: '#475569', fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: '800' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 14 },
  sectionTitle: { fontWeight: '800', color: '#0f172a', fontSize: 18 },

  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#eef2ff', borderRadius: 18, marginRight: 8 },
  chipActive: { backgroundColor: '#7c3aed' },
  chipText: { color: '#4338ca', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  dimText: { color: '#6b7280', marginTop: 4 },

  todayItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  todayLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  todayEmoji: { fontSize: 20 },
  todayTitle: { fontWeight: '700', color: '#111827' },
  todaySub: { color: '#6b7280', marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeHigh: { backgroundColor: '#fee2e2' },
  badgeMed: { backgroundColor: '#fef3c7' },
  badgeLow: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#111827' },

  emptyWrap: { padding: 20 },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  folderCard: { width: '48%', backgroundColor: '#fff', borderRadius: 18, padding: 14 },
  folderHeader: { marginBottom: 10 },
  folderTitle: { fontWeight: '800', color: '#0f172a' },
  folderStats: { flexDirection: 'row', gap: 8 },
  folderPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  folderPillText: { fontWeight: '700', color: '#991b1b', fontSize: 12 },

  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  calendarCourse: { width: 90, fontWeight: '700', color: '#1f2937' },
  calendarTitle: { flex: 1, color: '#374151' },
  calendarOverdue: { color: '#ef4444', fontWeight: '800', fontSize: 12 },

  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16, marginTop: 8 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#7c3aed', alignSelf: 'center', marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 28 },

  inputLabel: { color: '#6b7280', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },

  /* FAB & + menu */
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 54, alignItems: 'center' },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 6 },
  plusMenu: { position: 'absolute', left: 0, right: 0, bottom: 124, alignItems: 'center', gap: 10 },
  plusItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3 },
  plusText: { color: '#111827', fontWeight: '700' },

  /* Upload modal */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalDesc: { color: '#475569', marginTop: 6 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  aiToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  uploadRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  outlineBtn: { flex: 1, borderWidth: 1, borderColor: '#7c3aed', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#faf5ff' },
  outlineBtnText: { color: '#6d28d9', fontWeight: '800' },
  fileBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#f1f5f9' },
  fileBadgeText: { flex: 1, color: '#334155' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#e5e7eb', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryBtnText: { color: '#111827', fontWeight: '800' },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#7c3aed', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },

  /* Review blocks */
  editBlock: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  editRow: { marginBottom: 10 },
  twoCol: { flexDirection: 'row', marginTop: 10 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: 12 },
  selectText: { color: '#111827' },
  selectMenu: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginTop: 6, overflow: 'hidden' },
  selectItem: { paddingVertical: 10, paddingHorizontal: 12 },
  selectItemText: { color: '#111827' },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  iconDanger: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconDangerText: { color: '#ef4444', fontWeight: '800' },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },

  /* Bottom nav */
  navbar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#0b0f19' },
  navItem: { alignItems: 'center', justifyContent: 'center', gap: 2, width: 70 },
  navText: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  navTextActive: { color: '#a78bfa', fontWeight: '800' },
>>>>>>> parent of 8156aa39 (more changes)
});
