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
  status: 'ok' | 'error';
  message?: string;
  pdf_name?: string;
  image_name?: string;
  items?: DueItem[];
  llm_used?: boolean;
  llm_error?: string | null;
};

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
}

async function postText(text: string): Promise<ApiResponse> {
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
    [assignments]
  );

  const overdueCount = useMemo(
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
          </Text>
        </View>

        {/* Stats */}
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
    </View>
  );
}

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
});
