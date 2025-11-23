import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import {
  Home as HomeIcon,
  Calendar as CalendarIcon,
  Folder as FolderIcon,
  Plus,
  Upload,
  ChevronRight,
  X,
  Clock,
  Filter,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight as ArrowRight,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  Wand2,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

/** ========= Types ========= */
type Priority = 'high' | 'medium' | 'low';
type FilterType = 'today';
type AssignmentType =
  | 'Assignment'
  | 'Discussion'
  | 'Reading'
  | 'Art'
  | 'Quiz'
  | 'Test'
  | 'Project'
  | 'Other';

type FileAttachment = {
  uri: string;
  name: string;
  type: string;
  size: number;
};

type Assignment = {
  id: string; // use string to avoid key collisions
  title: string;
  course: string;
  dueISO?: string | null; // yyyy-mm-dd
  dueTime?: string; // display only
  priority: Priority;
  attachments?: FileAttachment[];
  type?: AssignmentType;
  description?: string;
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

type Draft = {
  id: string;
  title: string;
  course: string;
  type: AssignmentType;
  dueISO?: string | null;
  description?: string;
};

/** ========= Backend config ========= */
// On device set EXPO_PUBLIC_API_BASE to your machine’s LAN IP (no trailing slash)
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://10.44.180.114:8000').replace(
  /\/+$/,
  '',
);

/** ========= Utilities ========= */
const todayISO = new Date().toISOString().slice(0, 10);

function safeISO(input?: string | null): string | null {
  if (!input) return null;

  // already ISO?
  const isoMatch = input.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return isoMatch[0];

  // try Date()
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // try MM/DD/YYYY
  const mdy = input.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (mdy) {
    const m = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    const y = mdy[3].length === 2 ? Number('20' + mdy[3]) : Number(mdy[3]);
    const dt = new Date(y, m, day);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  return null;
}

function isSameISO(a?: string | null, b?: string | null) {
  return a && b ? a === b : false;
}

function isOverdue(iso?: string | null) {
  if (!iso) return false;
  return iso < todayISO;
}

function within7Days(iso?: string | null) {
  if (!iso) return false;
  const a = new Date(iso + 'T00:00:00');
  const b = new Date(todayISO + 'T00:00:00');
  const diff = (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function priorityFromISO(iso?: string | null): Priority {
  if (!iso) return 'low';
  if (isSameISO(iso, todayISO)) return 'high';
  if (within7Days(iso)) return 'medium';
  return 'low';
}

function nextId(prefix = 'a'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function postFileToBackend(
  endpointPath: string,
  file: { uri: string; name: string; type: string },
): Promise<ApiResponse> {
  const url = `${API_BASE}${endpointPath}`;
  const fd = new FormData();
  // Let RN set the boundary
  fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  const res = await fetch(url, { method: 'POST', body: fd });
  return (await res.json()) as ApiResponse;
}

/** ========= Small presentational components ========= */
const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
    activeOpacity={0.8}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Empty = ({ text }: { text: string }) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

/** ========= Class Folder Card ========= */
function ClassFolderCard({
  course,
  overdueCount,
  upcomingCount,
  onOpen,
}: {
  course: string;
  overdueCount: number;
  upcomingCount: number;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity style={styles.classCard} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.classHeaderRow}>
        <FolderIcon size={24} color="#6D28D9" />
        <Text numberOfLines={1} style={styles.classTitle}>
          {course || 'Untitled Class'}
        </Text>
      </View>

      <View style={styles.classPillsRow}>
        <View style={[styles.pill, styles.pillOverdue]}>
          <Text style={styles.pillText}>Overdue: {overdueCount}</Text>
        </View>
        <View style={[styles.pill, styles.pillUpcoming]}>
          <Text style={styles.pillText}>Upcoming: {upcomingCount}</Text>
        </View>
      </View>

      <View style={styles.classFooterRow}>
        <Text style={styles.viewText}>View</Text>
        <ChevronRight size={18} color="#6D28D9" />
      </View>
    </TouchableOpacity>
  );
}

/** ========= main screen ========= */
export default function HomeScreen() {
  /** Data */
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  /** UI state */
  const [plusOpen, setPlusOpen] = useState(false);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [aiRepair, setAiRepair] = useState(false);
  const [courseHint, setCourseHint] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Draft editor modal after Parse
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // Class assignments modal
  const [classOpen, setClassOpen] = useState(false);
  const [classOpenName, setClassOpenName] = useState('');

  // Calendar in-page
  const [calMode, setCalMode] = useState<'month' | 'week' | 'day'>('month');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedISO, setSelectedISO] = useState<string>(todayISO);

  /** Derived */
  const courses = useMemo(() => {
    const s = new Set<string>();
    assignments.forEach((a) => a.course && s.add(a.course));
    return Array.from(s);
  }, [assignments]);

  // Home filter chips (Today view)
  const [todayCourse, setTodayCourse] = useState<string | 'All'>('All');

  const dueTodayForCourse = useMemo(() => {
    const items = assignments.filter((a) => isSameISO(a.dueISO || null, todayISO));
    if (todayCourse === 'All') return items;
    return items.filter((a) => a.course === todayCourse);
  }, [assignments, todayCourse]);

  const upcoming7 = useMemo(
    () => assignments.filter((a) => within7Days(a.dueISO || null)),
    [assignments],
  );
  const overdue = useMemo(() => assignments.filter((a) => isOverdue(a.dueISO || null)), [assignments]);

  /** ======= Upload flow ======= */
  const handlePickPdf = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const a = result.assets[0];
    setParsing(true);
    try {
      const resp = await postFileToBackend(
        `/assignments/pdf?use_llm=${String(aiRepair)}`,
        {
          uri: a.uri,
          name: a.name || `syllabus_${Date.now()}.pdf`,
          type: a.mimeType || 'application/pdf',
        },
      );

      if (resp.status !== 'ok') {
        Alert.alert('Upload failed', resp.message || 'Server error');
        return;
      }
      const ds: Draft[] = (resp.items || []).map((it) => ({
        id: nextId('d'),
        title: it.title || 'Untitled',
        course: courseHint || it.course || '',
        type: 'Assignment',
        dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
        description: '',
      }));
      setDrafts(ds);
      setDraftsOpen(true);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setParsing(false);
    }
  }, [aiRepair, courseHint]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset: any = result.assets[0];

    setParsing(true);
    try {
      const resp = await postFileToBackend(
        `/assignments/image?preprocess=${encodeURIComponent('screenshot')}&use_llm=${String(
          aiRepair,
        )}`,
        {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        },
      );

      if (resp.status !== 'ok') {
        Alert.alert('Upload failed', resp.message || 'Server error');
        return;
      }
      const ds: Draft[] = (resp.items || []).map((it) => ({
        id: nextId('d'),
        title: it.title || 'Untitled',
        course: courseHint || it.course || '',
        type: 'Assignment',
        dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
        description: '',
      }));
      setDrafts(ds);
      setDraftsOpen(true);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setParsing(false);
    }
  }, [aiRepair, courseHint]);

  const handleParseText = useCallback(async () => {
    if (!syllabusText.trim()) {
      Alert.alert('Add some text', 'Paste syllabus text first.');
      return;
    }
    setParsing(true);
    try {
      const res = await fetch(`${API_BASE}/assignments/text`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: syllabusText }),
      });
      const json = (await res.json()) as ApiResponse;
      if (json.status !== 'ok') {
        Alert.alert('Parse failed', json.message || 'Server error');
        return;
      }
      const ds: Draft[] = (json.items || []).map((it) => ({
        id: nextId('d'),
        title: it.title || 'Untitled',
        course: courseHint || it.course || '',
        type: 'Assignment',
        dueISO: safeISO(it.due_date_iso || it.due_date_raw || null),
        description: '',
      }));
      setDrafts(ds);
      setDraftsOpen(true);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    } finally {
      setParsing(false);
    }
  }, [syllabusText, courseHint]);

  const saveDrafts = useCallback(() => {
    if (!drafts.length) {
      setDraftsOpen(false);
      setUploadOpen(false);
      return;
    }
    setAssignments((prev) => [
      ...prev,
      ...drafts.map((d) => ({
        id: nextId('a'),
        title: d.title,
        course: d.course,
        dueISO: d.dueISO || null,
        dueTime: '',
        priority: priorityFromISO(d.dueISO || null),
        type: d.type,
        description: d.description,
        attachments: [],
      })),
    ]);
    setDraftsOpen(false);
    setUploadOpen(false);
    setPlusOpen(false);
  }, [drafts]);

  /** ======= Calendar helpers ======= */
  const monthLabel = useMemo(
    () =>
      cursor.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      }),
    [cursor],
  );

  function daysInMonth(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }

  function startWeekday(d: Date) {
    const t = new Date(d);
    t.setDate(1);
    return t.getDay(); // 0..6, Sun..Sat
  }

  const monthGrid = useMemo(() => {
    const count = daysInMonth(cursor);
    const start = startWeekday(cursor);
    const cells: (string | null)[] = Array(start).fill(null);
    for (let i = 1; i <= count; i++) {
      const iso = new Date(cursor.getFullYear(), cursor.getMonth(), i).toISOString().slice(0, 10);
      cells.push(iso);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const dayAssignments = useMemo(
    () => assignments.filter((a) => isSameISO(a.dueISO || null, selectedISO)),
    [assignments, selectedISO],
  );

  /** ======= Render ======= */
  const now = new Date();
  const timeLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateLabel = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome! 📚</Text>
        <Text style={styles.sub}>{timeLabel} • {dateLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Clock size={20} color="#4F46E5" />
            </View>
            <Text style={styles.statTitle}>Upcoming (Next 7 Days)</Text>
            <Text style={[styles.statNumber, { color: '#4F46E5' }]}>{upcoming7.length}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Clock size={20} color="#DC2626" />
            </View>
            <Text style={styles.statTitle}>Overdue</Text>
            <Text style={[styles.statNumber, { color: '#DC2626' }]}>{overdue.length}</Text>
          </View>
        </View>

        {/* Today section */}
        <Section title="Today’s Assignments">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <Chip label="All" active={todayCourse === 'All'} onPress={() => setTodayCourse('All')} />
            {courses.map((c, i) => (
              <Chip
                key={`${c}-${i}`}
                label={c || 'Untitled'}
                active={todayCourse === c}
                onPress={() => setTodayCourse(c)}
              />
            ))}
          </ScrollView>

          {dueTodayForCourse.length === 0 ? (
            <Empty text="No assignments due today 🎉" />
          ) : (
            <View style={{ gap: 10 }}>
              {dueTodayForCourse.map((a) => (
                <View key={a.id} style={styles.taskCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{a.title}</Text>
                    {!!a.course && <Text style={styles.taskCourse}>{a.course}</Text>}
                    {!!a.type && <Text style={styles.taskType}>{a.type}</Text>}
                  </View>
                  <View
                    style={[
                      styles.dot,
                      a.priority === 'high'
                        ? { backgroundColor: '#EF4444' }
                        : a.priority === 'medium'
                        ? { backgroundColor: '#F59E0B' }
                        : { backgroundColor: '#10B981' },
                    ]}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Classes section (longer folder cards) */}
        <Section title="Classes">
          {courses.length === 0 ? (
            <Empty text="No classes yet. Upload a syllabus or add assignments!" />
          ) : (
            <View style={{ gap: 14 }}>
              {courses.map((course, idx) => {
                const items = assignments.filter((a) => a.course === course);
                const o = items.filter((a) => isOverdue(a.dueISO || null)).length;
                const u = items.filter((a) => within7Days(a.dueISO || null)).length;
                return (
                  <ClassFolderCard
                    key={`${course || 'class'}-${idx}`}
                    course={course}
                    overdueCount={o}
                    upcomingCount={u}
                    onOpen={() => {
                      setClassOpenName(course);
                      setClassOpen(true);
                    }}
                  />
                );
              })}
            </View>
          )}
        </Section>

        {/* Calendar section (Month / Week / Day) */}
        <Section title="Calendar">
          <View style={styles.modeRow}>
            {(['month', 'week', 'day'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setCalMode(m)}
                style={[styles.modeChip, calMode === m && styles.modeChipActive]}
              >
                <Text style={[styles.modeChipText, calMode === m && styles.modeChipTextActive]}>
                  {m[0].toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month */}
          {calMode === 'month' && (
            <View>
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  onPress={() => {
                    const d = new Date(cursor);
                    d.setMonth(d.getMonth() - 1);
                    setCursor(d);
                  }}
                  style={styles.monthNav}
                >
                  <ChevronLeft size={18} color="#6D28D9" />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{monthLabel}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const d = new Date(cursor);
                    d.setMonth(d.getMonth() + 1);
                    setCursor(d);
                  }}
                  style={styles.monthNav}
                >
                  <ArrowRight size={18} color="#6D28D9" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <Text key={d} style={styles.weekHeaderText}>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {monthGrid.map((iso, i) => {
                  const onDay = assignments.filter((a) => isSameISO(a.dueISO || null, iso || ''));
                  const has = !!iso && onDay.length > 0;
                  const sel = isSameISO(iso, selectedISO);
                  return (
                    <TouchableOpacity
                      key={`${iso ?? 'blank'}-${i}`}
                      activeOpacity={0.8}
                      onPress={() => iso && setSelectedISO(iso)}
                      style={[styles.cell, sel && styles.cellSelected, !iso && styles.cellEmpty]}
                    >
                      {!!iso && (
                        <>
                          <Text style={[styles.cellNum, sel && styles.cellNumSelected]}>
                            {iso.slice(-2).replace(/^0/, '')}
                          </Text>
                          {has && <View style={styles.cellDotRow}>
                            {/* show up to 2 dots like your reference */}
                            {onDay.slice(0, 2).map((a) => (
                              <View key={a.id} style={styles.cellDot} />
                            ))}
                          </View>}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Day detail */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.dayTitle}>
                  {new Date(selectedISO).toLocaleDateString([], {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </Text>
                {dayAssignments.length === 0 ? (
                  <Empty text="Nothing due this day." />
                ) : (
                  <View style={{ gap: 10 }}>
                    {dayAssignments.map((a) => (
                      <View key={a.id} style={styles.taskCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitle}>{a.title}</Text>
                          {!!a.course && <Text style={styles.taskCourse}>{a.course}</Text>}
                          {!!a.type && <Text style={styles.taskType}>{a.type}</Text>}
                        </View>
                        <MoreHorizontal size={18} color="#6B7280" />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Week */}
          {calMode === 'week' && (
            <View>
              <Text style={styles.weekLabel}>This Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {[...Array(7)].map((_, idx) => {
                  const d = new Date(selectedISO);
                  const day = d.getDay();
                  const mondayBased = new Date(d);
                  mondayBased.setDate(d.getDate() - day + idx);
                  const iso = mondayBased.toISOString().slice(0, 10);
                  const items = assignments.filter((a) => isSameISO(a.dueISO || null, iso));
                  const sel = isSameISO(iso, selectedISO);
                  return (
                    <TouchableOpacity
                      key={iso}
                      onPress={() => setSelectedISO(iso)}
                      style={[styles.dayChip, sel && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayChipText, sel && styles.dayChipTextActive]}>
                        {mondayBased.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                      </Text>
                      {items.length > 0 && <View style={styles.smallDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {dayAssignments.length === 0 ? (
                <Empty text="No assignments this day." />
              ) : (
                <View style={{ gap: 10 }}>
                  {dayAssignments.map((a) => (
                    <View key={a.id} style={styles.taskCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>{a.title}</Text>
                        {!!a.course && <Text style={styles.taskCourse}>{a.course}</Text>}
                        {!!a.type && <Text style={styles.taskType}>{a.type}</Text>}
                      </View>
                      <MoreHorizontal size={18} color="#6B7280" />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Day */}
          {calMode === 'day' && (
            <View>
              <Text style={styles.weekLabel}>
                {new Date(selectedISO).toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {dayAssignments.length === 0 ? (
                <Empty text="No assignments due today." />
              ) : (
                <View style={{ gap: 10 }}>
                  {dayAssignments.map((a) => (
                    <View key={a.id} style={styles.taskCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>{a.title}</Text>
                        {!!a.course && <Text style={styles.taskCourse}>{a.course}</Text>}
                        {!!a.type && <Text style={styles.taskType}>{a.type}</Text>}
                      </View>
                      <MoreHorizontal size={18} color="#6B7280" />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Section>
      </ScrollView>

      {/* Floating + menu */}
      <View style={styles.plusWrap}>
        {plusOpen && (
          <View style={styles.plusMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUploadOpen(true);
                setPlusOpen(false);
              }}
            >
              <Upload size={20} color="#111827" />
              <Text style={styles.menuItemText}>Upload Syllabus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Add Class', 'Hook up your class creator as needed')}
            >
              <FolderIcon size={20} color="#111827" />
              <Text style={styles.menuItemText}>Add Class</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Add Assignment', 'Hook up your manual add flow')}
            >
              <FileText size={20} color="#111827" />
              <Text style={styles.menuItemText}>Add Assignment</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => setPlusOpen((v) => !v)}
          activeOpacity={0.9}
        >
          <Plus size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Upload modal */}
      <Modal visible={uploadOpen} transparent animationType="fade" onRequestClose={() => setUploadOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Upload Syllabus</Text>
              <TouchableOpacity onPress={() => setUploadOpen(false)}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              Paste syllabus text or upload a file. We’ll extract assignments and dates automatically.
            </Text>

            <View style={styles.aiRow}>
              <TouchableOpacity
                onPress={() => setAiRepair((v) => !v)}
                style={[styles.aiToggle, aiRepair && styles.aiToggleOn]}
              >
                <Wand2 size={18} color={aiRepair ? '#fff' : '#6B7280'} />
                <Text style={[styles.aiToggleText, aiRepair && styles.aiToggleTextOn]}>AI Repair</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Course Name (optional)</Text>
            <TextInput
              placeholder="e.g., CS 326"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={courseHint}
              onChangeText={setCourseHint}
            />

            <Text style={styles.label}>Syllabus Text</Text>
            <TextInput
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholder="Paste syllabus text here…"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { height: 120 }]}
              value={syllabusText}
              onChangeText={setSyllabusText}
            />

            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.fileBtn} onPress={handlePickPdf}>
                <FileText size={18} color="#111827" />
                <Text style={styles.fileBtnText}>Upload PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.fileBtn} onPress={handlePickImage}>
                <ImageIcon size={18} color="#111827" />
                <Text style={styles.fileBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setUploadOpen(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={handleParseText}
                disabled={parsing}
              >
                <Text style={styles.primaryText}>{parsing ? 'Parsing…' : 'Parse Syllabus'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Draft editor modal */}
      <Modal visible={draftsOpen} transparent animationType="slide" onRequestClose={() => setDraftsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight: '90%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Review & Edit</Text>
              <TouchableOpacity onPress={() => setDraftsOpen(false)}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              Found {drafts.length} assignment{drafts.length === 1 ? '' : 's'}.
            </Text>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingVertical: 4 }}>
              {drafts.map((d, idx) => (
                <View key={d.id} style={styles.draftCard}>
                  <Text style={styles.draftIndex}>#{idx + 1}</Text>

                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    value={d.title}
                    onChangeText={(v) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, title: v } : x)))
                    }
                    style={styles.input}
                    placeholder="Assignment title"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.row2}>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.label}>Course</Text>
                      <TextInput
                        value={d.course}
                        onChangeText={(v) =>
                          setDrafts((prev) =>
                            prev.map((x) => (x.id === d.id ? { ...x, course: v } : x)),
                          )
                        }
                        style={styles.input}
                        placeholder="e.g., CS 326"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.label}>Type</Text>
                      <TextInput
                        value={d.type}
                        onChangeText={(v) =>
                          setDrafts((prev) =>
                            prev.map((x) =>
                              x.id === d.id ? { ...x, type: (v || 'Assignment') as AssignmentType } : x,
                            ),
                          )
                        }
                        style={styles.input}
                        placeholder="Assignment / Quiz / Test…"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={d.dueISO || ''}
                    onChangeText={(v) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, dueISO: safeISO(v) } : x)))
                    }
                    style={styles.input}
                    placeholder="2025-11-09"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.label}>Description (optional)</Text>
                  <TextInput
                    value={d.description || ''}
                    onChangeText={(v) =>
                      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, description: v } : x)))
                    }
                    style={[styles.input, { height: 80 }]}
                    multiline
                    textAlignVertical="top"
                    placeholder="Extra details…"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.draftRowEnd}>
                    <TouchableOpacity
                      onPress={() => setDrafts((prev) => prev.filter((x) => x.id !== d.id))}
                      style={styles.deleteIconBtn}
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setDrafts([])}
              >
                <Text style={styles.cancelText}>Start Over</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={saveDrafts}>
                <Save size={18} color="#fff" />
                <Text style={[styles.primaryText, { marginLeft: 6 }]}>Save All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Class modal */}
      <Modal visible={classOpen} transparent animationType="slide" onRequestClose={() => setClassOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight: '85%', width: '92%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{classOpenName}</Text>
              <TouchableOpacity onPress={() => setClassOpen(false)}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {assignments.filter((a) => a.course === classOpenName).length === 0 ? (
                <Empty text="No assignments for this class yet." />
              ) : (
                assignments
                  .filter((a) => a.course === classOpenName)
                  .sort((a, b) => (a.dueISO || '').localeCompare(b.dueISO || ''))
                  .map((a) => (
                    <View key={a.id} style={styles.taskCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitle}>{a.title}</Text>
                        {!!a.dueISO && (
                          <Text style={styles.taskCourse}>
                            Due {new Date(a.dueISO).toLocaleDateString()}
                          </Text>
                        )}
                        {!!a.type && <Text style={styles.taskType}>{a.type}</Text>}
                      </View>
                      <View
                        style={[
                          styles.dot,
                          a.priority === 'high'
                            ? { backgroundColor: '#EF4444' }
                            : a.priority === 'medium'
                            ? { backgroundColor: '#F59E0B' }
                            : { backgroundColor: '#10B981' },
                        ]}
                      />
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** ========= styles ========= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 16 },
  welcome: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  sub: { marginTop: 6, color: '#6B7280' },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  statIconWrap: {
    backgroundColor: '#E0E7FF',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statTitle: { color: '#111827', fontWeight: '600', marginBottom: 6 },
  statNumber: { fontSize: 28, fontWeight: '800' },

  section: { paddingHorizontal: 20, marginTop: 18 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },

  chip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#E0E7FF' },
  chipText: { color: '#111827', fontWeight: '600' },
  chipTextActive: { color: '#4F46E5' },

  emptyWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: '#6B7280' },

  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskTitle: { fontWeight: '700', color: '#111827' },
  taskCourse: { color: '#6B7280', marginTop: 2 },
  taskType: { color: '#6D28D9', marginTop: 2, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },

  // Class folder card – longer
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    minHeight: 120,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  classHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  classTitle: { fontSize: 18, fontWeight: '800', color: '#111827', flex: 1 },
  classPillsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pillOverdue: { backgroundColor: '#FDE8E8' },
  pillUpcoming: { backgroundColor: '#EDE9FE' },
  pillText: { fontWeight: '700', color: '#111827' },
  classFooterRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewText: { color: '#6D28D9', fontWeight: '800' },

  // Calendar
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  modeChipActive: { backgroundColor: '#EDE9FE' },
  modeChipText: { color: '#111827', fontWeight: '600' },
  modeChipTextActive: { color: '#6D28D9' },

  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: {
    backgroundColor: '#EEF2FF',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  monthTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  weekHeaderText: { width: `${100 / 7}%`, textAlign: 'center', color: '#6B7280', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  cellEmpty: { backgroundColor: 'transparent' },
  cellSelected: { borderWidth: 2, borderColor: '#6D28D9' },
  cellNum: { color: '#374151', fontWeight: '800' },
  cellNumSelected: { color: '#6D28D9' },
  cellDotRow: { position: 'absolute', right: 8, bottom: 8, gap: 4 },
  cellDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0E7FF' },

  dayTitle: { marginTop: 8, fontWeight: '800', color: '#111827' },
  weekLabel: { fontWeight: '800', color: '#111827', marginBottom: 10 },

  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayChipActive: { backgroundColor: '#EDE9FE' },
  dayChipText: { color: '#111827', fontWeight: '700' },
  dayChipTextActive: { color: '#6D28D9' },
  smallDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6D28D9' },

  // + menu
  plusWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  plusButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  plusMenu: {
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    width: 280,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuItemText: { fontWeight: '700', color: '#111827' },

  // Modals / sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  sheetSub: { color: '#6B7280', marginTop: 6, marginBottom: 10 },

  aiRow: { alignItems: 'flex-start', marginBottom: 8 },
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiToggleOn: { backgroundColor: '#6D28D9' },
  aiToggleText: { color: '#111827', fontWeight: '700' },
  aiToggleTextOn: { color: '#fff' },

  label: { color: '#6B7280', fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  rowButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fileBtnText: { fontWeight: '700', color: '#111827' },

  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelBtn: { backgroundColor: '#E5E7EB' },
  primaryBtn: { backgroundColor: '#7C3AED' },
  cancelText: { color: '#111827', fontWeight: '800' },
  primaryText: { color: '#fff', fontWeight: '800' },

  // Draft editor
  draftCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  draftIndex: { color: '#6B7280', fontWeight: '700', marginBottom: 6 },
  row2: { flexDirection: 'row' },
  draftRowEnd: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  deleteIconBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
