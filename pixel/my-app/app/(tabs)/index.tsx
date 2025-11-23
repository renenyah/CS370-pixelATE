import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Home,
  Calendar as CalIcon,
  Plus,
  User,
  FolderClosed,
  ChevronRight,
  Clock,
  Save,
  X,
  UploadCloud,
  Image as ImageIcon,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

/* --------------------------- Types & Constants --------------------------- */

type Priority = "high" | "medium" | "low";
type TabKey = "home" | "classes" | "calendar" | "profile";

type Assignment = {
  id: string; // use string so keys are always unique
  title: string;
  course: string;
  type: "Assignment" | "Reading" | "Discussion" | "Quiz" | "Test" | "Art" | "Other";
  dueDate: string; // ISO YYYY-MM-DD
  description?: string;
};

type DueItem = {
  title: string;
  course?: string;
  due_date_raw?: string;
  due_date_iso?: string;
  page?: number | null;
  source?: string;
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

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "http://10.44.180.114:8000").replace(
  /\/+$/,
  ""
);

/* ------------------------------- Date utils ------------------------------ */

function parseToISO(input?: string | null): string | null {
  if (!input) return null;

  // Already ISO-ish
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // Common M/D/YYYY or MM/DD/YYYY
  const mdy = input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (mdy) {
    let [_, m, d, y] = mdy;
    if (y.length === 2) y = Number(y) > 50 ? "19" + y : "20" + y;
    const month = String(Number(m)).padStart(2, "0");
    const day = String(Number(d)).padStart(2, "0");
    return `${y}-${month}-${day}`;
  }

  // Try native Date, but guard .toISOString()
  const dt = new Date(input);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameISO(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

function isOverdue(iso?: string | null): boolean {
  if (!iso) return false;
  return iso < todayISO();
}

function isWithin7Days(iso?: string | null): boolean {
  if (!iso) return false;
  const now = new Date(todayISO() + "T00:00:00");
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

/* ------------------------------- API helpers ----------------------------- */

function inferMimeFromName(name?: string, fallback = "application/octet-stream") {
  if (!name) return fallback;
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".heic")) return "image/heic";
  return fallback;
}

async function postFile(
  path: string,
  f: { uri: string; name: string; type: string }
): Promise<ApiResponse> {
  const fd = new FormData();
  fd.append("file", { uri: f.uri, name: f.name, type: f.type } as any);
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: fd });
  return (await res.json()) as ApiResponse;
}

async function postText(text: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/assignments/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return (await res.json()) as ApiResponse;
}

/* ----------------------------- UI subcomponents -------------------------- */

const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <View style={[styles.pill, { backgroundColor: color }]}>{children}</View>
);

const MetricCard: React.FC<{
  title: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}> = ({ title, value, color, icon }) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIcon, { borderColor: color }]}>{icon}</View>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

const FolderTile: React.FC<{
  name: string;
  overdue: number;
  upcoming: number;
  onPress: () => void;
}> = ({ name, overdue, upcoming, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.folderTile}
      activeOpacity={0.9}
    >
      <View style={styles.folderHeader}>
        <FolderClosed size={24} color="#6d28d9" />
        <Text style={styles.folderTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.folderStats}>
        <Pill color="rgba(239,68,68,0.12)">
          <Text style={styles.folderPillText}>Overdue: {overdue}</Text>
        </Pill>
        <Pill color="rgba(99,102,241,0.12)">
          <Text style={styles.folderPillText}>Upcoming: {upcoming}</Text>
        </Pill>
      </View>
      <View style={styles.folderCTA}>
        <Text style={styles.folderCTAtext}>View</Text>
        <ChevronRight size={18} color="#6d28d9" />
      </View>
    </TouchableOpacity>
  );
};

const ClassAssignmentsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  course: string;
  items: Assignment[];
}> = ({ visible, onClose, course, items }) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
    [items]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalHeaderTitle}>{course}</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={styles.classRow}>
            <View style={styles.classRowLeft}>
              <Text style={styles.classRowTitle}>{item.title}</Text>
              <Text style={styles.classRowSub}>
                {item.type} • Due {item.dueDate}
              </Text>
            </View>
          </View>
        )}
      />
    </Modal>
  );
};

/* ------------------------------- Main Screen ------------------------------ */

export default function HomeScreen() {
  const [active, setActive] = useState<TabKey>("home");

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // Upload / Parse state
  const [plusOpen, setPlusOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [useLLM, setUseLLM] = useState(false);
  const [courseHint, setCourseHint] = useState("");
  const [syllabusText, setSyllabusText] = useState("");

  // Review state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<Assignment[]>([]);

  // Classes modal
  const [classModalCourse, setClassModalCourse] = useState<string | null>(null);

  /* --------------------------- Derived collections --------------------------- */

  const classes = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.course?.trim()) set.add(a.course.trim());
    });
    return Array.from(set).sort();
  }, [assignments]);

  const todayList = useMemo(() => {
    const t = todayISO();
    return assignments.filter((a) => isSameISO(a.dueDate, t));
  }, [assignments]);

  const overdueCount = useMemo(
    () => assignments.filter((a) => isOverdue(a.dueDate)).length,
    [assignments]
  );

  const next7Count = useMemo(
    () => assignments.filter((a) => isWithin7Days(a.dueDate)).length,
    [assignments]
  );

  /* -------------------------------- Calendar -------------------------------- */

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startDow = (first.getDay() + 6) % 7; // make Monday=0 if you prefer; keeping Sunday=0 feel -> we’ll use 0..6 with Sunday leftmost as in screenshot
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    const cells: { iso?: string; label?: number }[] = [];
    // leading blanks
    for (let i = 0; i < first.getDay(); i++) cells.push({});
    // actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const y = month.getFullYear();
      const m = String(month.getMonth() + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ iso: `${y}-${m}-${dd}`, label: d });
    }
    // trailing blanks to complete rows
    while (cells.length % 7 !== 0) cells.push({});
    return cells;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!a.dueDate) continue;
      if (!map.has(a.dueDate)) map.set(a.dueDate, []);
      map.get(a.dueDate)!.push(a);
    }
    return map;
  }, [assignments]);

  /* ----------------------------- Upload & Review ----------------------------- */

  function itemsToAssignments(items: DueItem[]): Assignment[] {
    let c = 0;
    return items.map((it) => {
      const iso = parseToISO(it.due_date_iso || it.due_date_raw) || todayISO();
      return {
        id: `imp-${Date.now()}-${c++}`,
        title: it.title || "Untitled",
        course: it.course || courseHint || "",
        type: "Assignment",
        dueDate: iso,
        description: "",
      };
    });
  }

  async function handlePickPdfOrImage() {
    // Action sheet mimic: two buttons
    Alert.alert(
      "Upload",
      "Choose a file type",
      [
        {
          text: "PDF",
          onPress: async () => {
            const r = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf"],
              copyToCacheDirectory: true,
            });
            if (!r.canceled && r.assets?.[0]) {
              const a = r.assets[0];
              const resp = await postFile(`/assignments/pdf?use_llm=${String(useLLM)}`, {
                uri: a.uri,
                name: a.name || "syllabus.pdf",
                type: a.mimeType || inferMimeFromName(a.name, "application/pdf"),
              });
              if (resp.status !== "ok") {
                Alert.alert("Upload failed", resp.message || "Server error");
                return;
              }
              const converted = itemsToAssignments(resp.items || []);
              if (converted.length === 0) {
                Alert.alert("No assignments found", "Try AI Repair or paste text.");
                return;
              }
              setReviewItems(converted);
              setUploadOpen(false);
              setReviewOpen(true);
            }
          },
        },
        {
          text: "Image",
          onPress: async () => {
            const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (p.status !== "granted") {
              Alert.alert("Permission required", "Please allow photo access.");
              return;
            }
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
            if (!r.canceled && r.assets?.[0]) {
              const asset = r.assets[0] as any;
              const name = asset.fileName || "syllabus.jpg";
              const resp = await postFile(
                `/assignments/image?preprocess=adaptive&use_llm=${String(useLLM)}`,
                {
                  uri: asset.uri,
                  name,
                  type: asset.type || inferMimeFromName(name, "image/jpeg"),
                }
              );
              if (resp.status !== "ok") {
                Alert.alert("Upload failed", resp.message || "Server error");
                return;
              }
              const converted = itemsToAssignments(resp.items || []);
              if (converted.length === 0) {
                Alert.alert("No assignments found", "Try AI Repair or paste text.");
                return;
              }
              setReviewItems(converted);
              setUploadOpen(false);
              setReviewOpen(true);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  }

  async function handleParseText() {
    if (!syllabusText.trim()) {
      Alert.alert("Nothing to parse", "Paste syllabus text first.");
      return;
    }
    const resp = await postText(syllabusText);
    if (resp.status !== "ok") {
      Alert.alert("Parse failed", resp.message || "Server error");
      return;
    }
    const converted = itemsToAssignments(resp.items || []);
    if (converted.length === 0) {
      Alert.alert("No assignments found", "Try AI Repair or upload a file.");
      return;
    }
    setReviewItems(converted);
    setUploadOpen(false);
    setReviewOpen(true);
  }

  function commitReviewed() {
    // Append to main list
    setAssignments((prev) => [...prev, ...reviewItems]);
    setReviewItems([]);
    setReviewOpen(false);
  }

  /* --------------------------------- Render --------------------------------- */

  const header = (
    <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 20 }}>
      <Text style={styles.h1}>Welcome! 📚</Text>
      <Text style={styles.subtle}>
        {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })} •{" "}
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>
    </View>
  );

  function renderHome() {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {header}

        {/* metrics */}
        <View style={styles.metricRow}>
          <MetricCard
            title="Upcoming (Next 7 Days)"
            value={next7Count}
            color="#6366F1"
            icon={<Clock size={18} color="#6366F1" />}
          />
          <MetricCard
            title="Overdue"
            value={overdueCount}
            color="#EF4444"
            icon={<Clock size={18} color="#EF4444" />}
          />
        </View>

        {/* Today's Assignments with filter by class */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s Assignments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setCourseHint("")}
                style={[
                  styles.filterChip,
                  !courseHint && { backgroundColor: "#6D28D9" },
                ]}
              >
                <Text style={[styles.filterChipText, !courseHint && { color: "#fff" }]}>All</Text>
              </TouchableOpacity>
              {classes.map((c, i) => (
                <TouchableOpacity
                  key={`${c}-${i}`}
                  onPress={() => setCourseHint(c)}
                  style={[
                    styles.filterChip,
                    courseHint === c && { backgroundColor: "#6D28D9" },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      courseHint === c && { color: "#fff" },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {todayList.filter((a) => !courseHint || a.course === courseHint).length === 0 ? (
            <Text style={styles.subtle}>No assignments due today 🎉</Text>
          ) : (
            todayList
              .filter((a) => !courseHint || a.course === courseHint)
              .map((a) => (
                <View key={a.id} style={styles.todayRow}>
                  <Text style={styles.todayRowTitle}>{a.title}</Text>
                  <Text style={styles.todayRowSub}>
                    {a.course} • {a.type}
                  </Text>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    );
  }

  function renderClasses() {
    // Build per-course counts
    const courseSummaries = classes.map((course) => {
      const items = assignments.filter((a) => a.course === course);
      const overdue = items.filter((a) => isOverdue(a.dueDate)).length;
      const upcoming = items.filter((a) => isWithin7Days(a.dueDate)).length;
      return { course, items, overdue, upcoming };
    });

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {header}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.cardTitle}>Classes</Text>
        </View>

        <View style={styles.folderGrid}>
          {courseSummaries.map((c, idx) => (
            <FolderTile
              key={`${c.course}-${idx}`}
              name={c.course}
              overdue={c.overdue}
              upcoming={c.upcoming}
              onPress={() => setClassModalCourse(c.course)}
            />
          ))}
          {courseSummaries.length === 0 && (
            <Text style={[styles.subtle, { paddingHorizontal: 24 }]}>
              No classes yet — upload a syllabus with the ➕ button.
            </Text>
          )}
        </View>

        {/* modal for selected class */}
        <ClassAssignmentsModal
          visible={!!classModalCourse}
          onClose={() => setClassModalCourse(null)}
          course={classModalCourse || ""}
          items={assignments.filter((a) => a.course === (classModalCourse || ""))}
        />
      </ScrollView>
    );
  }

  function renderCalendar() {
    const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 10 }}>
          <Text style={styles.h1}>📅 {monthLabel}</Text>
        </View>

        {/* nav */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            onPress={() =>
              setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            style={styles.monthNavBtn}
          >
            <Text style={styles.monthNavTxt}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            style={styles.monthNavBtn}
          >
            <Text style={styles.monthNavTxt}>›</Text>
          </TouchableOpacity>
        </View>

        {/* grid */}
        <View style={styles.weekLabels}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} style={styles.weekLabel}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {monthDays.map((cell, i) => {
            const list = cell.iso ? eventsByDay.get(cell.iso) || [] : [];
            return (
              <View key={`cell-${i}`} style={styles.dayCell}>
                <Text style={[styles.dayNumber, !cell.iso && { opacity: 0 }]}>
                  {cell.label ?? ""}
                </Text>
                <View style={{ gap: 4, width: "100%" }}>
                  {list.slice(0, 3).map((a, j) => (
                    <View
                      key={`${a.id}-${j}`}
                      style={[
                        styles.eventPill,
                        {
                          backgroundColor: isOverdue(a.dueDate)
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(99,102,241,0.15)",
                        },
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.eventPillText}>
                        {a.course || ""} {a.title ? "· " + a.title : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  function renderProfile() {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {header}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>

          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>SN</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput placeholder="Student Name" style={styles.input} />
              <TextInput placeholder="student@university.edu" style={styles.input} />
              <TextInput placeholder="New password" secureTextEntry style={styles.input} />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  /* ----------------------------- Upload Modal UI ---------------------------- */

  const uploadModal = (
    <Modal visible={uploadOpen} transparent animationType="fade">
      <View style={styles.scrim}>
        <View style={styles.uploadCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalHeaderTitle}>Upload Syllabus</Text>
            <TouchableOpacity onPress={() => setUploadOpen(false)}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <Text style={styles.uploadHint}>
            Paste your syllabus text or upload a file. We’ll extract assignments and dates.
          </Text>

          {/* LLM Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>AI Repair</Text>
            <TouchableOpacity
              onPress={() => setUseLLM((v) => !v)}
              style={[styles.toggle, useLLM && styles.toggleOn]}
            >
              <View style={[styles.toggleKnob, useLLM && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Course Name (optional)"
            value={courseHint}
            onChangeText={setCourseHint}
            style={styles.input}
          />

          <TextInput
            placeholder="Paste syllabus text here…"
            value={syllabusText}
            onChangeText={setSyllabusText}
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            multiline
          />

          <View style={styles.rowGap12}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePickPdfOrImage}>
              <UploadCloud size={18} color="#111827" />
              <Text style={styles.secondaryBtnTxt}>Upload PDF / Image</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setUploadOpen(false)}>
                <RotateCcw size={18} color="#111827" />
                <Text style={styles.ghostBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleParseText}>
                <FileText size={18} color="#fff" />
                <Text style={styles.primaryBtnTxt}>Parse Syllabus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  /* ----------------------------- Review Modal UI ---------------------------- */

  const [openTypePickerIndex, setOpenTypePickerIndex] = useState<number | null>(null);

  const reviewModal = (
    <Modal visible={reviewOpen} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalHeaderTitle}>Review & Edit</Text>
        <TouchableOpacity
          onPress={() => {
            setReviewItems([]);
            setReviewOpen(false);
          }}
        >
          <X size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={styles.uploadHint}>
          Found {reviewItems.length} assignment{reviewItems.length === 1 ? "" : "s"}.
        </Text>

        {reviewItems.map((it, idx) => (
          <View key={it.id} style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Title</Text>
              <TextInput
                value={it.title}
                onChangeText={(t) =>
                  setReviewItems((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], title: t };
                    return copy;
                  })
                }
                style={styles.input}
              />
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewLabel}>Course</Text>
                <TextInput
                  value={it.course}
                  onChangeText={(t) =>
                    setReviewItems((prev) => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], course: t };
                      return copy;
                    })
                  }
                  style={styles.input}
                />
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.reviewLabel}>Type</Text>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => setOpenTypePickerIndex(idx === openTypePickerIndex ? null : idx)}
                >
                  <Text style={styles.selectTxt}>{it.type}</Text>
                  <ChevronRight size={18} color="#6b7280" />
                </TouchableOpacity>
                {openTypePickerIndex === idx && (
                  <View style={styles.selectMenu}>
                    {["Assignment", "Reading", "Discussion", "Quiz", "Test", "Art", "Other"].map(
                      (opt) => (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => {
                            setReviewItems((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], type: opt as any };
                              return copy;
                            });
                            setOpenTypePickerIndex(null);
                          }}
                          style={styles.selectItem}
                        >
                          <Text>{opt}</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reviewLabel}>Due Date</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={it.dueDate}
                  onChangeText={(t) =>
                    setReviewItems((prev) => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], dueDate: parseToISO(t) || t };
                      return copy;
                    })
                  }
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Description (optional)</Text>
              <TextInput
                value={it.description || ""}
                onChangeText={(t) =>
                  setReviewItems((prev) => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], description: t };
                    return copy;
                  })
                }
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                multiline
              />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity
                onPress={() =>
                  setReviewItems((prev) => prev.filter((_, j) => j !== idx))
                }
                style={styles.dangerBtn}
              >
                <Trash2 size={18} color="#fff" />
                <Text style={styles.dangerBtnTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.reviewFooter}>
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => {
            setReviewItems([]);
            setReviewOpen(false);
            setUploadOpen(true);
          }}
        >
          <RotateCcw size={18} color="#111827" />
          <Text style={styles.ghostBtnTxt}>Start Over</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={commitReviewed}>
          <Save size={18} color="#fff" />
          <Text style={styles.primaryBtnTxt}>Save All</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  /* ----------------------------- Bottom nav & FAB --------------------------- */

  const bottomBar = (
    <View style={styles.navBar}>
      <TouchableOpacity
        onPress={() => setActive("home")}
        style={[styles.navItem, active === "home" && styles.navActive]}
      >
        <Home size={20} color={active === "home" ? "#8b5cf6" : "#cbd5e1"} />
        <Text style={[styles.navTxt, active === "home" && styles.navTxtActive]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActive("classes")}
        style={[styles.navItem, active === "classes" && styles.navActive]}
      >
        <FolderClosed size={20} color={active === "classes" ? "#8b5cf6" : "#cbd5e1"} />
        <Text style={[styles.navTxt, active === "classes" && styles.navTxtActive]}>Classes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setPlusOpen((v) => !v)}
        style={styles.fab}
        activeOpacity={0.9}
      >
        <Plus size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActive("calendar")}
        style={[styles.navItem, active === "calendar" && styles.navActive]}
      >
        <CalIcon size={20} color={active === "calendar" ? "#8b5cf6" : "#cbd5e1"} />
        <Text style={[styles.navTxt, active === "calendar" && styles.navTxtActive]}>
          Calendar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActive("profile")}
        style={[styles.navItem, active === "profile" && styles.navActive]}
      >
        <User size={20} color={active === "profile" ? "#8b5cf6" : "#cbd5e1"} />
        <Text style={[styles.navTxt, active === "profile" && styles.navTxtActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const plusMenu = plusOpen && (
    <View style={styles.plusMenu}>
      <TouchableOpacity
        style={styles.plusItem}
        onPress={() => {
          setPlusOpen(false);
          setUploadOpen(true);
        }}
      >
        <UploadCloud size={18} color="#111827" />
        <Text style={styles.plusTxt}>Upload Syllabus</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.plusItem}
        onPress={() => Alert.alert("Add Class", "Coming soon (manual add).")}
      >
        <FolderClosed size={18} color="#111827" />
        <Text style={styles.plusTxt}>Add Class</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.plusItem}
        onPress={() => Alert.alert("Add Assignment", "Use syllabus upload for now.")}
      >
        <FileText size={18} color="#111827" />
        <Text style={styles.plusTxt}>Add Assignment</Text>
      </TouchableOpacity>
    </View>
  );

  /* --------------------------------- Return --------------------------------- */

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      {active === "home" && renderHome()}
      {active === "classes" && renderClasses()}
      {active === "calendar" && renderCalendar()}
      {active === "profile" && renderProfile()}

      {bottomBar}
      {plusMenu}
      {uploadModal}
      {reviewModal}
    </View>
  );
}

/* --------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800", color: "#111827" },
  subtle: { color: "#6b7280" },

  metricRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24 },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderRadius: 999,
    padding: 6,
  },
  metricTitle: { color: "#374151", fontWeight: "600" },
  metricValue: { fontSize: 28, fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },

  filterChip: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipText: { color: "#6b7280", fontWeight: "600" },

  todayRow: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  todayRowTitle: { fontWeight: "700", color: "#111827" },
  todayRowSub: { color: "#6b7280", marginTop: 2 },

  sectionHeaderRow: { paddingHorizontal: 24, marginTop: 8, marginBottom: 8 },

  folderGrid: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  folderTile: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  folderHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  folderTitle: { fontWeight: "800", color: "#111827", fontSize: 16 },
  folderStats: { flexDirection: "row", gap: 8, marginVertical: 8 },
  folderPillText: { color: "#111827", fontWeight: "600", fontSize: 12 },
  folderCTA: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  folderCTAtext: { color: "#6d28d9", fontWeight: "700" },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },

  /* Calendar */
  monthNavRow: {
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthNavBtn: {
    backgroundColor: "#eef2ff",
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavTxt: { color: "#6d28d9", fontSize: 18, fontWeight: "800" },
  weekLabels: { flexDirection: "row", paddingHorizontal: 24, gap: 8, marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: "center", color: "#6b7280", fontWeight: "700" },
  grid: { paddingHorizontal: 24, gap: 8, flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: (Platform.OS === "web" ? 630 : 342) / 7, // reasonable width on phones; grid will wrap nicely
    backgroundColor: "#fff",
    height: 80,
    borderRadius: 14,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dayNumber: { fontWeight: "800", color: "#6b7280", marginBottom: 4 },
  eventPill: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  eventPillText: { fontSize: 11, color: "#374151" },

  /* Upload modal */
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHeaderTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  uploadHint: { color: "#6b7280" },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  toggleLabel: { fontWeight: "700", color: "#111827" },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    padding: 2,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "#8b5cf6" },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  toggleKnobOn: { transform: [{ translateX: 24 }] },

  rowGap12: { gap: 12 },

  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },

  secondaryBtn: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  secondaryBtnTxt: { color: "#111827", fontWeight: "700" },

  ghostBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  ghostBtnTxt: { color: "#111827", fontWeight: "700" },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  primaryBtnTxt: { color: "#fff", fontWeight: "700" },

  dangerBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dangerBtnTxt: { color: "#fff", fontWeight: "700" },

  reviewCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 12 },
  reviewRow: { marginBottom: 10 },
  reviewLabel: { color: "#6b7280", marginBottom: 6, fontWeight: "700" },
  twoCol: { flexDirection: "row", marginBottom: 10 },

  select: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectTxt: { color: "#111827" },
  selectMenu: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  selectItem: { padding: 12 },

  reviewFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
  },

  /* Profile */
  profileTop: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 20 },

  /* Bottom nav */
  navBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#0b0f17",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", gap: 2, paddingHorizontal: 8 },
  navTxt: { color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  navActive: {},
  navTxtActive: { color: "#8b5cf6" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  plusMenu: {
    position: "absolute",
    bottom: 92,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
  },
  plusItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  plusTxt: { fontWeight: "700", color: "#111827" },
});
