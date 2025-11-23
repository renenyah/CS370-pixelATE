import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch
} from 'react-native';
import {
  Home as HomeIcon,
  Clock,
  Calendar,
  BookOpen,
  Plus,
  Paperclip,
  X,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

/* ================================
   Types
==================================*/
type Priority = 'high' | 'medium' | 'low';
type Filter = 'today' | 'tomorrow' | 'active';
type Tab = 'home' | 'upcoming' | 'calendar' | 'classes';

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
  dueDate: string;   // ISO or raw text; we normalize when possible
  dueTime: string;
  priority: Priority;
  tab: Filter;
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
  items?: DueItem[];
  llm_used?: boolean;
  llm_error?: string | null;
};

type UniClass = { id: number; name: string };

/* ================================
   Backend config
==================================*/
// On device, set EXPO_PUBLIC_API_BASE to your laptop’s LAN IP (e.g. http://192.168.1.23:8000)
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || 'http://10.44.180.114:8000').replace(/\/+$/, '');
const DEFAULT_PREPROCESS = 'screenshot';

function inferMimeFromName(name?: string, fallback = 'application/octet-stream') {
  if (!name) return fallback;
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.heic')) return 'image/heic';
  return fallback;
}

async function postFileToBackend(endpointPath: string, file: { uri: string; name: string; type: string }) {
  const url = `${API_BASE}${endpointPath}`;
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  const res = await fetch(url, { method: 'POST', body: fd });
  return (await res.json()) as ApiResponse;
}

/* ================================
   Component
==================================*/
export default function Index() {
  const [tab, setTab] = useState<Tab>('home');

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Classes (for filtering & schedule)
  const [classes, setClasses] = useState<UniClass[]>([]);
  const [classCreateOpen, setClassCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  // Create Assignment
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newAttachments, setNewAttachments] = useState<FileAttachment[]>([]);

  // Edit Assignment
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editAttachments, setEditAttachments] = useState<FileAttachment[]>([]);

  // Upload / Import with AI
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [useAIRepair, setUseAIRepair] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  type Draft = DueItem & { selected: boolean; _id: string };
  const [draftItems, setDraftItems] = useState<Draft[]>([]);

  // FAB
  const [fabOpen, setFabOpen] = useState(false);

  /* ---------- Helpers ---------- */
  const todayMidnight = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const isSameDay = (iso: string, base: Date) => {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return false;
    const b = new Date(base);
    d.setHours(0,0,0,0); b.setHours(0,0,0,0);
    return d.getTime() === b.getTime();
  };

  const categorizeDateAndPriority = (dateString: string): { priority: Priority; tab: Filter } => {
    const today = todayMidnight();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const inputDate = new Date(dateString);
    if (!isFinite(inputDate.getTime())) return { priority: 'low', tab: 'active' };
    inputDate.setHours(0,0,0,0);

    if (inputDate.getTime() === today.getTime()) return { priority: 'high', tab: 'today' };
    if (inputDate.getTime() === tomorrow.getTime()) return { priority: 'medium', tab: 'tomorrow' };
    return { priority: 'low', tab: 'active' };
  };

  const pushBackendItems = (items: DueItem[]) => {
    setAssignments(prev => {
      let nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
      const mapped: Assignment[] = (items || []).map(it => {
        const title = it.title || 'Untitled';
        const course = it.course || '';
        const dueDate = it.due_date_iso || it.due_date_raw || '';
        const { priority, tab } = dueDate ? categorizeDateAndPriority(dueDate) : { priority: 'low' as Priority, tab: 'active' as Filter };
        return { id: nextId++, icon: '📝', title, course, dueDate, dueTime: '', priority, tab, attachments: [] };
      });
      return [...prev, ...mapped];
    });
  };

  const formatCountUpcoming7 = useMemo(() => {
    const now = new Date();
    const in7 = new Date(); in7.setDate(now.getDate() + 7);
    return assignments.filter(a => {
      const d = new Date(a.dueDate);
      return isFinite(d.getTime()) && d >= now && d <= in7;
    }).length;
  }, [assignments]);

  const formatCountOverdue = useMemo(() => {
    const now = new Date();
    return assignments.filter(a => {
      const d = new Date(a.dueDate);
      return isFinite(d.getTime()) && d < now;
    }).length;
  }, [assignments]);

  const assignmentsDueToday = useMemo(() => {
    const base = todayMidnight();
    const todays = assignments.filter(a => isSameDay(a.dueDate, base));
    if (!selectedClassId) return todays;
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? todays.filter(a => (a.course || '').trim().toLowerCase() === cls.name.trim().toLowerCase()) : todays;
  }, [assignments, classes, selectedClassId]);

  const getPriorityColor = (p: Priority) => (p === 'high' ? '#ef4444' : p === 'medium' ? '#f59e0b' : '#10b981');

  /* ---------- File pickers (for add/edit forms) ---------- */
  const pickDocument = async (isEditing = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const file: FileAttachment = {
          uri: asset.uri,
          name: asset.name || `upload_${Date.now()}`,
          type: asset.mimeType || inferMimeFromName(asset.name),
          size: asset.size || 0,
        };
        if (isEditing) setEditAttachments(prev => [...prev, file]);
        else setNewAttachments(prev => [...prev, file]);
      }
    } catch (e) { Alert.alert('Error', 'Failed to pick document'); }
  };

  const pickImage = async (isEditing = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: false, quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset: any = result.assets[0];
        const file: FileAttachment = {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || inferMimeFromName(asset.fileName, 'image/jpeg'),
          size: asset.fileSize || 0,
        };
        if (isEditing) setEditAttachments(prev => [...prev, file]);
        else setNewAttachments(prev => [...prev, file]);
      }
    } catch (e) { Alert.alert('Error', 'Failed to pick image'); }
  };

  /* ---------- Upload flow (➕ → Upload Syllabus) ---------- */
  const chooseAndParseFile = async () => {
    try {
      setUploadBusy(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) { setUploadBusy(false); return; }

      const asset = result.assets[0];
      const name = asset.name || `upload_${Date.now()}`;
      const type = asset.mimeType || inferMimeFromName(asset.name);
      const file = { uri: asset.uri, name, type };

      const isImage = (type || '').startsWith('image/');
      const endpoint = isImage
        ? `/assignments/image?preprocess=${encodeURIComponent(DEFAULT_PREPROCESS)}&use_llm=${String(useAIRepair)}`
        : `/assignments/pdf?use_llm=${String(useAIRepair)}`;

      const resp = await postFileToBackend(endpoint, file);
      setUploadBusy(false);

      if (resp.status !== 'ok') { Alert.alert('Upload failed', resp.message || 'Server error'); return; }
      const found = resp.items || [];
      if (!found.length) { Alert.alert('No assignments found', 'Try a different file or toggle AI Repair.'); return; }

      const seeded: Draft[] = found.map((it, idx) => ({ ...it, selected: true, _id: `${Date.now()}_${idx}` }));
      setDraftItems(seeded);
    } catch (e) {
      setUploadBusy(false);
      Alert.alert('Error', 'Failed while uploading/parsing.');
    }
  };

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDraftItems(prev => prev.map(d => (d._id === id ? { ...d, ...patch } : d)));

  const importSelected = () => {
    const toImport: DueItem[] = draftItems.filter(d => d.selected).map(d => ({
      title: d.title, due_date_raw: d.due_date_raw, due_date_iso: d.due_date_iso, page: d.page, source: d.source, course: d.course
    }));
    if (!toImport.length) { Alert.alert('Nothing selected', 'Choose at least one item.'); return; }
    pushBackendItems(toImport);
    setDraftItems([]); setUploadModalOpen(false);
    Alert.alert('Imported', `Added ${toImport.length} assignment(s).`);
  };

  /* ---------- Create / Edit / Classes ---------- */
  const addAssignment = () => {
    const newId = assignments.length ? assignments[assignments.length - 1].id + 1 : 1;
    const { priority, tab } = categorizeDateAndPriority(newDueDate);
    setAssignments(prev => [...prev, {
      id: newId, icon: '📝', title: newTitle, course: newCourse, dueDate: newDueDate, dueTime: newDueTime, priority, tab, attachments: newAttachments
    }]);
    setCreatingAssignment(false);
    setNewTitle(''); setNewCourse(''); setNewDueDate(''); setNewDueTime(''); setNewAttachments([]);
  };

  const startEditing = (a: Assignment) => {
    setEditingAssignment(a);
    setEditTitle(a.title); setEditCourse(a.course); setEditDueDate(a.dueDate); setEditDueTime(a.dueTime); setEditAttachments(a.attachments || []);
  };

  const saveChanges = () => {
    if (!editingAssignment) return;
    const { priority, tab } = categorizeDateAndPriority(editDueDate);
    setAssignments(prev => prev.map(i => i.id === editingAssignment.id
      ? { ...i, title: editTitle, course: editCourse, dueDate: editDueDate, dueTime: editDueTime, priority, tab, attachments: editAttachments }
      : i
    ));
    setEditingAssignment(null);
  };

  const deleteAssignment = () => {
    if (!editingAssignment) return;
    setAssignments(prev => prev.filter(i => i.id !== editingAssignment.id));
    setEditingAssignment(null);
  };

  const createClass = () => {
    const name = newClassName.trim();
    if (!name) { Alert.alert('Class name required'); return; }
    setClasses(prev => [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 1, name }]);
    setNewClassName(''); setClassCreateOpen(false);
  };

  /* ---------- Tiny helpers ---------- */
  const getCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const formatFileSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1048576).toFixed(1)} MB`;

  /* ================================
     Screens
  ==================================*/
  const HomeScreen = () => (
    <ScrollView style={styles.screenScroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <Text style={styles.headerSubtitle}>{getCurrentTime()} {getCurrentDate()}</Text>
      </View>

      {/* Two metric cards */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Upcoming (Next 7 Days)</Text>
          <Text style={styles.overviewNumber}>{formatCountUpcoming7}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Overdue</Text>
          <Text style={styles.overviewNumber}>{formatCountOverdue}</Text>
        </View>
      </View>

      {/* Filters by class */}
      <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
        <Text style={styles.sectionTitle}>Assignments Due Today</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedClassId(null)}
              style={[styles.pill, selectedClassId === null && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedClassId === null && styles.pillTextActive]}>All</Text>
            </TouchableOpacity>
            {classes.length === 0 ? (
              <View style={[styles.pill, { backgroundColor: '#f3f4f6', borderStyle: 'dashed', borderWidth: 1 }]}>
                <Text style={{ color: '#6b7280' }}>Add classes to filter</Text>
              </View>
            ) : (
              classes.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedClassId(c.id)}
                  style={[styles.pill, selectedClassId === c.id && styles.pillActive]}
                >
                  <Text style={[styles.pillText, selectedClassId === c.id && styles.pillTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Today list */}
        {assignmentsDueToday.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>No assignments due today!</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {assignmentsDueToday.map(a => (
              <View key={a.id} style={styles.taskCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.taskIcon}><Text style={styles.taskEmoji}>{a.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{a.title}</Text>
                    <Text style={styles.courseName}>{a.course}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>{a.dueDate}{a.dueTime ? ` • ${a.dueTime}` : ''}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(a.priority) }]}>
                        <Text style={styles.priorityText}>{a.priority.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => startEditing(a)}><Text style={{ fontSize: 18 }}>⋮</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={{ height: 96 }} />
    </ScrollView>
  );

  const UpcomingScreen = () => {
    const now = new Date();
    const upcoming = assignments
      .filter(a => {
        const d = new Date(a.dueDate);
        return isFinite(d.getTime()) && d >= now;
      })
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    return (
      <ScrollView style={styles.screenScroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upcoming</Text>
          <Text style={styles.headerSubtitle}>Next deadlines in order</Text>
        </View>
        {upcoming.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyText}>No upcoming assignments!</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 16 }}>
            {upcoming.map(a => (
              <View key={a.id} style={styles.taskCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={styles.taskIcon}><Text style={styles.taskEmoji}>{a.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{a.title}</Text>
                    <Text style={styles.courseName}>{a.course}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{a.dueDate}{a.dueTime ? ` • ${a.dueTime}` : ''}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => startEditing(a)}><Text style={{ fontSize: 18 }}>⋮</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 96 }} />
      </ScrollView>
    );
  };

  const CalendarScreen = () => (
    <ScrollView style={styles.screenScroll}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <Text style={styles.headerSubtitle}>Month view (static scaffold)</Text>
      </View>
      {/* Simple static month grid from earlier */}
      <View style={{ padding: 16 }}>
        <View style={styles.dayLabels}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
        </View>
        <View style={styles.calendarGrid}>
          {[ [0,0,0,0,0,1,2],
             [3,4,5,6,7,8,9],
             [10,11,12,13,14,15,16],
             [17,18,19,20,21,22,23],
             [24,25,26,27,28,29,30] ].map((week, wi) => (
            <View key={wi} style={styles.calendarRow}>
              {week.map((day, di) =>
                day === 0
                  ? <View key={`e_${wi}_${di}`} style={[styles.calendarDay, styles.emptyDay]} />
                  : <View key={`d_${wi}_${di}`} style={styles.calendarDay}><Text style={styles.dayNumber}>{day}</Text></View>
              )}
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 96 }} />
    </ScrollView>
  );

  const ClassesScreen = () => (
    <ScrollView style={styles.screenScroll}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classes</Text>
        <Text style={styles.headerSubtitle}>Manage your course list</Text>
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No classes yet. Tap the ➕ and choose “Add Class”.</Text>
          </View>
        ) : (
          classes.map(c => (
            <View key={c.id} style={styles.classRow}>
              <Text style={{ fontSize: 16, color: '#111827' }}>{c.name}</Text>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 96 }} />
    </ScrollView>
  );

  /* ================================
     Render
  ==================================*/
  return (
    <View style={styles.container}>
      {tab === 'home' && <HomeScreen />}
      {tab === 'upcoming' && <UpcomingScreen />}
      {tab === 'calendar' && <CalendarScreen />}
      {tab === 'classes' && <ClassesScreen />}

      {/* Floating Action Button & menu */}
      {fabOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setUploadModalOpen(true); setFabOpen(false); }}>
            <Text style={styles.fabMenuItemText}>📄 Upload Syllabus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setClassCreateOpen(true); setFabOpen(false); }}>
            <Text style={styles.fabMenuItemText}>🏫 Add Class</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabMenuItem} onPress={() => { setCreatingAssignment(true); setFabOpen(false); }}>
            <Text style={styles.fabMenuItemText}>✅ Add Assignment</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.fabButton} onPress={() => setFabOpen(!fabOpen)}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Bottom navigation bar (icons around ➕) */}
      <View style={styles.navbar}>
        <View style={styles.navSide}>
          <TouchableOpacity style={styles.navItem} onPress={() => setTab('home')}>
            <HomeIcon size={20} color={tab==='home' ? '#6d28d9' : '#6b7280'} />
            <Text style={[styles.navText, tab==='home' && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setTab('upcoming')}>
            <Clock size={20} color={tab==='upcoming' ? '#6d28d9' : '#6b7280'} />
            <Text style={[styles.navText, tab==='upcoming' && styles.navTextActive]}>Upcoming</Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 64 }} />

        <View style={styles.navSide}>
          <TouchableOpacity style={styles.navItem} onPress={() => setTab('calendar')}>
            <Calendar size={20} color={tab==='calendar' ? '#6d28d9' : '#6b7280'} />
            <Text style={[styles.navText, tab==='calendar' && styles.navTextActive]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => setTab('classes')}>
            <BookOpen size={20} color={tab==='classes' ? '#6d28d9' : '#6b7280'} />
            <Text style={[styles.navText, tab==='classes' && styles.navTextActive]}>Classes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- Modals ---------- */}
      {/* Create Assignment */}
      {creatingAssignment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Assignment</Text>
              <TouchableOpacity onPress={() => setCreatingAssignment(false)}><X size={22} color="#111827" /></TouchableOpacity>
            </View>
            <ScrollView>
              <TextInput style={styles.modalInput} placeholder="Title" value={newTitle} onChangeText={setNewTitle} />
              <TextInput style={styles.modalInput} placeholder="Course (match class name)" value={newCourse} onChangeText={setNewCourse} />
              <TextInput style={styles.modalInput} placeholder="Due Date (YYYY-MM-DD)" value={newDueDate} onChangeText={setNewDueDate} />
              <TextInput style={styles.modalInput} placeholder="Due Time (e.g., 17:00)" value={newDueTime} onChangeText={setNewDueTime} />

              <TouchableOpacity style={styles.attachButton} onPress={() =>
                Alert.alert('Attach File', 'Choose type', [
                  { text: 'PDF/Document', onPress: () => pickDocument(false) },
                  { text: 'Image', onPress: () => pickImage(false) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }>
                <Paperclip size={18} color="#6d28d9" /><Text style={styles.attachText}>Attach File</Text>
              </TouchableOpacity>

              {newAttachments.map((f, i) => (
                <View key={i} style={styles.fileRow}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(f.size)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setCreatingAssignment(false)}><Text style={styles.btnGhostText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={addAssignment}><Text style={styles.btnPrimaryText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Assignment */}
      {editingAssignment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Assignment</Text>
              <TouchableOpacity onPress={() => setEditingAssignment(null)}><X size={22} color="#111827" /></TouchableOpacity>
            </View>
            <ScrollView>
              <TextInput style={styles.modalInput} placeholder="Title" value={editTitle} onChangeText={setEditTitle} />
              <TextInput style={styles.modalInput} placeholder="Course" value={editCourse} onChangeText={setEditCourse} />
              <TextInput style={styles.modalInput} placeholder="Due Date (YYYY-MM-DD)" value={editDueDate} onChangeText={setEditDueDate} />
              <TextInput style={styles.modalInput} placeholder="Due Time" value={editDueTime} onChangeText={setEditDueTime} />
              <TouchableOpacity style={styles.attachButton} onPress={() =>
                Alert.alert('Attach File', 'Choose type', [
                  { text: 'PDF/Document', onPress: () => pickDocument(true) },
                  { text: 'Image', onPress: () => pickImage(true) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }>
                <Paperclip size={18} color="#6d28d9" /><Text style={styles.attachText}>Attach File</Text>
              </TouchableOpacity>
              {editAttachments.map((f, i) => (
                <View key={i} style={styles.fileRow}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(f.size)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={deleteAssignment}><Text style={styles.btnDangerText}>Delete</Text></TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setEditingAssignment(null)}><Text style={styles.btnGhostText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveChanges}><Text style={styles.btnPrimaryText}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Add Class */}
      {classCreateOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class</Text>
              <TouchableOpacity onPress={() => setClassCreateOpen(false)}><X size={22} color="#111827" /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} placeholder="e.g., CS 334" value={newClassName} onChangeText={setNewClassName} />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setClassCreateOpen(false)}><Text style={styles.btnGhostText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={createClass}><Text style={styles.btnPrimaryText}>Add Class</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Upload / Review & Import with AI */}
      {uploadModalOpen && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Syllabus</Text>
              <TouchableOpacity onPress={() => { setUploadModalOpen(false); setDraftItems([]); }}>
                <X size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.aiRow}>
              <Text style={styles.aiLabel}>AI Repair</Text>
              <Switch value={useAIRepair} onValueChange={setUseAIRepair} />
            </View>

            <TouchableOpacity style={styles.attachButton} onPress={chooseAndParseFile} disabled={uploadBusy}>
              <Paperclip size={18} color="#6d28d9" />
              <Text style={styles.attachText}>{uploadBusy ? 'Processing…' : 'Choose PDF / Image'}</Text>
            </TouchableOpacity>

            <ScrollView style={{ marginTop: 12 }}>
              {draftItems.map(d => (
                <View key={d._id} style={styles.draftRow}>
                  <TouchableOpacity onPress={() => updateDraft(d._id, { selected: !d.selected })} style={[styles.draftCheckbox, d.selected && styles.draftCheckboxOn]} />
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.draftTitle}
                      value={d.title}
                      onChangeText={t => updateDraft(d._id, { title: t })}
                      placeholder="Title"
                    />
                    <TextInput
                      style={styles.draftDate}
                      value={d.due_date_iso || d.due_date_raw || ''}
                      onChangeText={t => {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) updateDraft(d._id, { due_date_iso: t, due_date_raw: t });
                        else updateDraft(d._id, { due_date_raw: t, due_date_iso: t });
                      }}
                      placeholder="YYYY-MM-DD or date text"
                    />
                    <TextInput
                      style={styles.draftCourse}
                      value={d.course || ''}
                      onChangeText={t => updateDraft(d._id, { course: t })}
                      placeholder="Course (optional)"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setDraftItems([])}><Text style={styles.btnGhostText}>Clear</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={importSelected}><Text style={styles.btnPrimaryText}>Import Selected</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ================================
   Styles
==================================*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  screenScroll: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  overviewRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 },
  overviewCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  overviewTitle: { color: '#6b7280', fontSize: 12, marginBottom: 6 },
  overviewNumber: { fontSize: 26, fontWeight: '800', color: '#111827' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#6d28d9', borderColor: '#6d28d9' },
  pillText: { color: '#111827' },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 24, backgroundColor: 'transparent' },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280' },

  taskCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  taskEmoji: { fontSize: 18 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  courseName: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  priorityText: { fontSize: 10, color: '#fff' },

  // Calendar scaffold
  dayLabels: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#6b7280' },
  calendarGrid: { gap: 8, paddingHorizontal: 16 },
  calendarRow: { flexDirection: 'row', gap: 8 },
  calendarDay: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#fff' },
  emptyDay: { backgroundColor: 'transparent' },
  dayNumber: { fontSize: 14, color: '#111827', fontWeight: '500' },

  // Bottom nav
  navbar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 66, backgroundColor: '#111827', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16
  },
  navSide: { flexDirection: 'row', gap: 22, alignItems: 'center' },
  navItem: { alignItems: 'center' },
  navText: { marginTop: 4, fontSize: 11, color: '#9ca3af' },
  navTextActive: { color: '#e5e7eb', fontWeight: '600' },

  // FAB
  fabButton: {
    position: 'absolute', bottom: 33, left: '50%', marginLeft: -28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#6d28d9',
    alignItems: 'center', justifyContent: 'center', zIndex: 20,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 8,
  },
  fabMenu: {
    position: 'absolute', bottom: 100, left: '50%', transform: [{ translateX: -110 }],
    backgroundColor: '#fff', width: 220, borderRadius: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, zIndex: 30,
  },
  fabMenuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  fabMenuItemText: { color: '#111827', fontSize: 14 },

  // Modals base
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 40 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalCardLarge: { width: '100%', maxWidth: 640, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 10 },

  // Buttons
  modalFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#6d28d9' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnGhostText: { color: '#111827', fontWeight: '600' },
  btnDanger: { backgroundColor: '#ef4444' },
  btnDangerText: { color: '#fff', fontWeight: '700' },

  // Attachments
  attachButton: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 12 },
  attachText: { color: '#6d28d9', fontWeight: '600' },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  fileName: { color: '#111827', flex: 1, marginRight: 8 },
  fileSize: { color: '#6b7280' },

  // Upload drafts
  aiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  aiLabel: { fontSize: 14, color: '#111827', fontWeight: '600' },
  draftRow: { flexDirection: 'row', gap: 10, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 8 },
  draftCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#fff', marginTop: 4 },
  draftCheckboxOn: { backgroundColor: '#6d28d9', borderColor: '#6d28d9' },
  draftTitle: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, marginBottom: 6, backgroundColor: '#fff' },
  draftDate: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, marginBottom: 6, backgroundColor: '#fff' },
  draftCourse: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, backgroundColor: '#fff' },

  // Class list row
  classRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eef2f7' },
});
