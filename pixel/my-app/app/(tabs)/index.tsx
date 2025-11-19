import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Menu, Plus, User, Settings, ChevronRight, Clock, X, Bell, Award, LogOut, Paperclip, Calendar } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// --- TYPE DEFINITIONS ---
type Priority = 'high' | 'medium' | 'low';
type Filter = 'today' | 'tomorrow' | 'active';

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
  dueDate: string;
  dueTime: string;
  priority: Priority;
  tab: string;
  attachments?: FileAttachment[];
};

export default function HomeScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<Filter>('today');
  
  // --- SIDEBAR STATE ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSidebarView, setActiveSidebarView] = useState<'menu' | 'profile' | 'settings'>('menu');

  // --- USER PROFILE STATE ---
  const [userName, setUserName] = useState('Student Name');
  const [userEmail, setUserEmail] = useState('student@university.edu');
  const [userMajor, setUserMajor] = useState('Computer Science');

  // --- SETTINGS STATE ---
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // --- EDITING STATE ---
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editAttachments, setEditAttachments] = useState<FileAttachment[]>([]);

  const startEditing = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditTitle(assignment.title);
    setEditCourse(assignment.course);
    setEditDueDate(assignment.dueDate);
    setEditDueTime(assignment.dueTime);
    setEditPriority(assignment.priority);
    setEditAttachments(assignment.attachments || []);
  };

  const saveChanges = () => {
    if (!editingAssignment) return;
    
    // Auto-categorize based on date
    const { priority, tab } = categorizeDateAndPriority(editDueDate);
    
    setAssignments(prev =>
      prev.map(item =>
        item.id === editingAssignment.id
          ? { ...item, title: editTitle, course: editCourse, dueDate: editDueDate, dueTime: editDueTime, priority, tab, attachments: editAttachments }
          : item
      )
    );
    setEditingAssignment(null);
  };

  const deleteAssignment = () => {
    if (!editingAssignment) return;
    setAssignments(prev => prev.filter(item => item.id !== editingAssignment.id));
    setEditingAssignment(null);
  };

  // --- CREATE STATE ---
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newAttachments, setNewAttachments] = useState<FileAttachment[]>([]);

  // --- CALENDAR STATE ---
  const [calendarOpen, setCalendarOpen] = useState(false);

  // --- DATE CATEGORIZATION FUNCTION ---
  const categorizeDateAndPriority = (dateString: string): { priority: Priority; tab: Filter } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Parse the input date
    const inputDate = new Date(dateString);
    inputDate.setHours(0, 0, 0, 0);
    
    if (inputDate.getTime() === today.getTime()) {
      return { priority: 'high', tab: 'today' };
    } else if (inputDate.getTime() === tomorrow.getTime()) {
      return { priority: 'medium', tab: 'tomorrow' };
    } else {
      return { priority: 'low', tab: 'active' };
    }
  };

  // --- FILE PICKER FUNCTIONS ---
  const pickDocument = async (isEditing: boolean = false) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const file: FileAttachment = {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        };

        if (isEditing) {
          setEditAttachments(prev => [...prev, file]);
        } else {
          setNewAttachments(prev => [...prev, file]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
      console.error(err);
    }
  };

  const pickImage = async (isEditing: boolean = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const file: FileAttachment = {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
          size: asset.fileSize || 0,
        };

        if (isEditing) {
          setEditAttachments(prev => [...prev, file]);
        } else {
          setNewAttachments(prev => [...prev, file]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(err);
    }
  };

  const showFilePicker = (isEditing: boolean = false) => {
    Alert.alert(
      'Attach File',
      'Choose file type',
      [
        { text: 'PDF/Document', onPress: () => pickDocument(isEditing) },
        { text: 'Image', onPress: () => pickImage(isEditing) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeAttachment = (index: number, isEditing: boolean = false) => {
    if (isEditing) {
      setEditAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setNewAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addAssignment = () => {
    const newId = assignments.length ? assignments[assignments.length - 1].id + 1 : 1;
    
    // Auto-categorize based on date
    const { priority, tab } = categorizeDateAndPriority(newDueDate);
    
    setAssignments(prev => [
      ...prev,
      {
        id: newId,
        icon: '📝',
        title: newTitle,
        course: newCourse,
        dueDate: newDueDate,
        dueTime: newDueTime,
        priority,
        tab,
        attachments: newAttachments,
      },
    ]);
    setCreatingAssignment(false);
    setNewTitle('');
    setNewCourse('');
    setNewDueDate('');
    setNewDueTime('');
    setNewPriority('medium');
    setNewAttachments([]);
  };

  const getFilteredAssignments = () => assignments.filter(a => a.tab === filter);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium';
      case 'low': return 'Low Priority';
    }
  };

  const openSidebar = (view: 'menu' | 'profile' | 'settings') => {
    setActiveSidebarView(view);
    setSidebarOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <View style={styles.container}>
      {/* --- CALENDAR MODAL --- */}
      {calendarOpen && (
        <View style={styles.calendarOverlay}>
          <TouchableOpacity 
            style={styles.calendarBackdrop} 
            onPress={() => setCalendarOpen(false)}
            activeOpacity={1}
          />
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>📅 Calendar</Text>
              <TouchableOpacity onPress={() => setCalendarOpen(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.calendarContent}>
              {/* Month Header */}
              <View style={styles.monthHeader}>
                <TouchableOpacity style={styles.monthNav}>
                  <Text style={styles.monthNavText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>November 2024</Text>
                <TouchableOpacity style={styles.monthNav}>
                  <Text style={styles.monthNavText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Day Labels */}
              <View style={styles.dayLabels}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.dayLabel}>{day}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {/* Week 1 */}
                <View style={styles.calendarRow}>
                  <View style={[styles.calendarDay, styles.emptyDay]} />
                  <View style={[styles.calendarDay, styles.emptyDay]} />
                  <View style={[styles.calendarDay, styles.emptyDay]} />
                  <View style={[styles.calendarDay, styles.emptyDay]} />
                  <View style={[styles.calendarDay, styles.emptyDay]} />
                  <TouchableOpacity style={styles.calendarDay}>
                    <Text style={styles.dayNumber}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.calendarDay}>
                    <Text style={styles.dayNumber}>2</Text>
                  </TouchableOpacity>
                </View>

                {/* Week 2 */}
                <View style={styles.calendarRow}>
                  {[3, 4, 5, 6, 7, 8, 9].map(day => (
                    <TouchableOpacity key={day} style={styles.calendarDay}>
                      <Text style={styles.dayNumber}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Week 3 */}
                <View style={styles.calendarRow}>
                  {[10, 11, 12, 13, 14, 15, 16].map(day => (
                    <TouchableOpacity key={day} style={styles.calendarDay}>
                      <Text style={styles.dayNumber}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Week 4 - Current Day */}
                <View style={styles.calendarRow}>
                  {[17, 18, 19, 20, 21, 22, 23].map(day => (
                    <TouchableOpacity 
                      key={day} 
                      style={[styles.calendarDay, day === 18 && styles.currentDay]}
                    >
                      <Text style={[styles.dayNumber, day === 18 && styles.currentDayText]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Week 5 */}
                <View style={styles.calendarRow}>
                  {[24, 25, 26, 27, 28, 29, 30].map(day => (
                    <TouchableOpacity key={day} style={styles.calendarDay}>
                      <Text style={styles.dayNumber}>{day}</Text>
                      {day === 25 && <View style={styles.assignmentDot} />}
                      {day === 28 && <View style={styles.assignmentDot} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Today's Assignments */}
              <View style={styles.todaySection}>
                <Text style={styles.todaySectionTitle}>Today's Assignments</Text>
                {assignments.filter(a => a.tab === 'today').length === 0 ? (
                  <Text style={styles.noAssignmentsText}>No assignments due today 🎉</Text>
                ) : (
                  assignments.filter(a => a.tab === 'today').map((assignment) => (
                    <View key={assignment.id} style={styles.miniTaskCard}>
                      <Text style={styles.miniTaskEmoji}>{assignment.icon}</Text>
                      <View style={styles.miniTaskInfo}>
                        <Text style={styles.miniTaskTitle}>{assignment.title}</Text>
                        <Text style={styles.miniTaskCourse}>{assignment.course}</Text>
                      </View>
                      <View style={[styles.miniPriorityDot, { backgroundColor: getPriorityColor(assignment.priority) }]} />
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Good evening! 📚</Text>
          <Text style={styles.headerSubtitle}>
            {getCurrentTime()} {getCurrentDate()}
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Menu Card */}
          <View style={styles.menuCard}>
            <View style={styles.menuTop}>
              <TouchableOpacity style={styles.menuLeft} onPress={() => openSidebar('menu')}>
                <Menu size={28} color="#9333ea" strokeWidth={2.5} />
                <Text style={styles.menuText}>MENU</Text>
              </TouchableOpacity>

              <View style={styles.menuIcons}>
                <TouchableOpacity style={[styles.iconButton, styles.purpleButton]} onPress={() => setCalendarOpen(true)}>
                  <Calendar size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, styles.greenButton]} onPress={() => setCreatingAssignment(true)}>
                  <Plus size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryContainer}>
                <View style={styles.checkbox} />
                <TouchableOpacity style={styles.categoryButton}><Text style={styles.categoryText}>□ Math</Text></TouchableOpacity>
                <TouchableOpacity style={styles.categoryButton}><Text style={styles.categoryText}>□ Science</Text></TouchableOpacity>
                <TouchableOpacity style={styles.categoryButton}><Text style={styles.categoryText}>□ Programming</Text></TouchableOpacity>
                <ChevronRight size={24} color="#9333ea" />
              </View>
            </ScrollView>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search assignments..."
                placeholderTextColor="#4b5563"
              />
              <TouchableOpacity style={styles.searchButton}>
                <Text style={styles.searchIcon}>🔍</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
                onPress={() => setFilter('today')}
              >
                <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>Due Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filter === 'tomorrow' && styles.filterButtonActive]}
                onPress={() => setFilter('tomorrow')}
              >
                <Text style={[styles.filterText, filter === 'tomorrow' && styles.filterTextActive]}>Due Tomorrow</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
                onPress={() => setFilter('active')}
              >
                <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Upcoming</Text>
              </TouchableOpacity>

              <ChevronRight size={24} color="#9333ea" style={styles.filterChevron} />
            </View>
          </ScrollView>

          {/* Assignment List */}
          <View style={styles.taskList}>
            {getFilteredAssignments().length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyText}>
                  No assignments {filter === 'today' ? 'due today' : filter === 'tomorrow' ? 'due tomorrow' : 'upcoming'}!
                </Text>
              </View>
            ) : (
              getFilteredAssignments().map((assignment) => (
                <View key={assignment.id} style={styles.taskCard}>
                  <View style={styles.taskLeft}>
                    <View style={styles.taskIcon}>
                      <Text style={styles.taskEmoji}>{assignment.icon}</Text>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>{assignment.title}</Text>
                      <Text style={styles.courseName}>{assignment.course}</Text>
                      <View style={styles.taskMeta}>
                        <Clock size={16} color="#6b7280" />
                        <Text style={styles.taskTime}>{assignment.dueDate}</Text>
                        {assignment.dueTime && <Text style={styles.taskTime}> • {assignment.dueTime}</Text>}
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(assignment.priority) }]}>
                          <Text style={styles.priorityText}>{getPriorityLabel(assignment.priority)}</Text>
                        </View>
                      </View>
                      {assignment.attachments && assignment.attachments.length > 0 && (
                        <View style={styles.attachmentIndicator}>
                          <Paperclip size={14} color="#9333ea" />
                          <Text style={styles.attachmentCount}>{assignment.attachments.length} file(s)</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.taskMenu} onPress={() => startEditing(assignment)}>
                    <Text style={styles.taskMenuDots}>⋮</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- SIDEBAR --- */}
      {sidebarOpen && (
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebar}>
            <ScrollView>
              {/* Sidebar Header */}
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>
                  {activeSidebarView === 'menu' && 'Menu'}
                  {activeSidebarView === 'profile' && 'Profile'}
                  {activeSidebarView === 'settings' && 'Settings'}
                </Text>
                <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                  <X size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* MENU VIEW */}
              {activeSidebarView === 'menu' && (
                <View style={styles.sidebarContent}>
                  <TouchableOpacity 
                    style={styles.sidebarItem}
                    onPress={() => openSidebar('profile')}
                  >
                    <User size={24} color="#9333ea" />
                    <Text style={styles.sidebarItemText}>Profile</Text>
                    <ChevronRight size={20} color="#9ca3af" style={styles.sidebarItemChevron} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.sidebarItem}
                    onPress={() => openSidebar('settings')}
                  >
                    <Settings size={24} color="#9333ea" />
                    <Text style={styles.sidebarItemText}>Settings</Text>
                    <ChevronRight size={20} color="#9ca3af" style={styles.sidebarItemChevron} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sidebarItem}>
                    <Award size={24} color="#9333ea" />
                    <Text style={styles.sidebarItemText}>Achievements</Text>
                    <ChevronRight size={20} color="#9ca3af" style={styles.sidebarItemChevron} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sidebarItem}>
                    <Bell size={24} color="#9333ea" />
                    <Text style={styles.sidebarItemText}>Notifications</Text>
                    <ChevronRight size={20} color="#9ca3af" style={styles.sidebarItemChevron} />
                  </TouchableOpacity>

                  <View style={styles.sidebarDivider} />

                  <TouchableOpacity style={styles.sidebarItem}>
                    <LogOut size={24} color="#ef4444" />
                    <Text style={[styles.sidebarItemText, { color: '#ef4444' }]}>Logout</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PROFILE VIEW */}
              {activeSidebarView === 'profile' && (
                <View style={styles.sidebarContent}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>
                      {userName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileLabel}>Name</Text>
                    <TextInput
                      style={styles.profileInput}
                      value={userName}
                      onChangeText={setUserName}
                      placeholder="Your name"
                    />
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileLabel}>Email</Text>
                    <TextInput
                      style={styles.profileInput}
                      value={userEmail}
                      onChangeText={setUserEmail}
                      placeholder="your.email@university.edu"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.profileSection}>
                    <Text style={styles.profileLabel}>Major</Text>
                    <TextInput
                      style={styles.profileInput}
                      value={userMajor}
                      onChangeText={setUserMajor}
                      placeholder="Your major"
                    />
                  </View>

                  <View style={styles.profileStats}>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatNumber}>{assignments.length}</Text>
                      <Text style={styles.profileStatLabel}>Assignments</Text>
                    </View>
                    <View style={styles.profileStat}>
                      <Text style={styles.profileStatNumber}>
                        {assignments.filter(a => a.tab === 'today').length}
                      </Text>
                      <Text style={styles.profileStatLabel}>Due Today</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.profileSaveButton}>
                    <Text style={styles.profileSaveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SETTINGS VIEW */}
              {activeSidebarView === 'settings' && (
                <View style={styles.sidebarContent}>
                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Notifications</Text>
                    
                    <View style={styles.settingsItem}>
                      <View style={styles.settingsItemLeft}>
                        <Bell size={20} color="#6b7280" />
                        <Text style={styles.settingsItemText}>Push Notifications</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.toggle, notificationsEnabled && styles.toggleActive]}
                        onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                      >
                        <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Appearance</Text>
                    
                    <View style={styles.settingsItem}>
                      <View style={styles.settingsItemLeft}>
                        <Text style={styles.settingsItemIcon}>🌙</Text>
                        <Text style={styles.settingsItemText}>Dark Mode</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.toggle, darkModeEnabled && styles.toggleActive]}
                        onPress={() => setDarkModeEnabled(!darkModeEnabled)}
                      >
                        <View style={[styles.toggleCircle, darkModeEnabled && styles.toggleCircleActive]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>About</Text>
                    <Text style={styles.settingsAboutText}>
                      Assignment Tracker v1.0{'\n'}
                      Built with React Native & Expo
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
          <TouchableOpacity 
            style={styles.sidebarBackdrop} 
            onPress={() => setSidebarOpen(false)}
            activeOpacity={1}
          />
        </View>
      )}

      {/* --- EDIT MODAL --- */}
      {editingAssignment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalScrollWrapper}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Assignment</Text>

                <TextInput
                  style={styles.modalInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Assignment Name"
                  placeholderTextColor="#4b5563"
                />

                <TextInput
                  style={styles.modalInput}
                  value={editCourse}
                  onChangeText={setEditCourse}
                  placeholder="Course/Class"
                  placeholderTextColor="#4b5563"
                />

                <TextInput
                  style={styles.modalInput}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="Due Date (e.g., 2024-11-18)"
                  placeholderTextColor="#4b5563"
                />

                <TextInput
                  style={styles.modalInput}
                  value={editDueTime}
                  onChangeText={setEditDueTime}
                  placeholder="Due Time (e.g., 5:00 PM)"
                  placeholderTextColor="#4b5563"
                />

                {/* Attachments Section */}
                <View style={styles.attachmentSection}>
                  <Text style={styles.attachmentSectionTitle}>Attachments</Text>
                  
                  {editAttachments.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <View style={styles.fileInfo}>
                        <Paperclip size={16} color="#9333ea" />
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                          <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeAttachment(index, true)}>
                        <X size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={styles.attachButton}
                    onPress={() => showFilePicker(true)}
                  >
                    <Paperclip size={20} color="#9333ea" />
                    <Text style={styles.attachButtonText}>Attach File</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditingAssignment(null)}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveChanges}>
                    <Text style={styles.modalButtonText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={deleteAssignment}>
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* --- CREATE MODAL --- */}
      {creatingAssignment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalScrollWrapper}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Assignment</Text>

                <TextInput
                  style={styles.modalInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Assignment Name"
                  placeholderTextColor="#4b5563"
                />
                <TextInput
                  style={styles.modalInput}
                  value={newCourse}
                  onChangeText={setNewCourse}
                  placeholder="Course/Class"
                  placeholderTextColor="#4b5563"
                />
                <TextInput
                  style={styles.modalInput}
                  value={newDueDate}
                  onChangeText={setNewDueDate}
                  placeholder="Due Date (e.g., 2024-11-18)"
                  placeholderTextColor="#4b5563"
                />
                <TextInput
                  style={styles.modalInput}
                  value={newDueTime}
                  onChangeText={setNewDueTime}
                  placeholder="Due Time (e.g., 5:00 PM)"
                  placeholderTextColor="#4b5563"
                />

                {/* Attachments Section */}
                <View style={styles.attachmentSection}>
                  <Text style={styles.attachmentSectionTitle}>Attachments</Text>
                  
                  {newAttachments.map((file, index) => (
                    <View key={index} style={styles.fileItem}>
                      <View style={styles.fileInfo}>
                        <Paperclip size={16} color="#9333ea" />
                        <View style={styles.fileDetails}>
                          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                          <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeAttachment(index, false)}>
                        <X size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={styles.attachButton}
                    onPress={() => showFilePicker(false)}
                  >
                    <Paperclip size={20} color="#9333ea" />
                    <Text style={styles.attachButtonText}>Attach File</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setCreatingAssignment(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={addAssignment}
                  >
                    <Text style={styles.modalButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scrollContainer: { flex: 1 },

  header: { paddingHorizontal: 24, paddingTop: 96, paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },

  content: { flex: 1, backgroundColor: '#f3f4f6', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 24 },

  menuCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, zIndex: 1 },
  menuTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuText: { fontSize: 18, fontWeight: 'bold', color: '#9333ea' },
  menuIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  iconButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  greenButton: { backgroundColor: '#16a34a' },
  purpleButton: { backgroundColor: '#9333ea' },

  categoryScroll: { marginBottom: 16 },
  categoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20 },
  categoryText: { color: '#374151', fontSize: 14 },

  searchContainer: { position: 'relative' },
  searchInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#111827' },
  searchButton: { position: 'absolute', right: 12, top: 12 },
  searchIcon: { fontSize: 20 },

  filterScroll: { marginBottom: 16 },
  filterContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterButton: { paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 20 },
  filterButtonActive: { backgroundColor: '#fff' },
  filterText: { color: '#6b7280', fontSize: 14 },
  filterTextActive: { color: '#9333ea', fontWeight: '600' },
  filterChevron: { marginLeft: 8 },

  taskList: { gap: 12, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6b7280' },

  taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  taskIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  taskEmoji: { fontSize: 20 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  courseName: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskTime: { fontSize: 12, color: '#6b7280' },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 10, color: '#fff' },
  taskMenu: { paddingHorizontal: 8 },
  taskMenuDots: { fontSize: 18 },

  attachmentIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  attachmentCount: { fontSize: 12, color: '#9333ea', fontWeight: '500' },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalScrollWrapper: { width: '90%', maxWidth: 500, maxHeight: '85%' },
  modalScrollContent: { flexGrow: 1, paddingVertical: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
  
  attachmentSection: { marginBottom: 16, marginTop: 8 },
  attachmentSectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  fileItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 8 },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  fileSize: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  attachButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, borderStyle: 'dashed' },
  attachButtonText: { fontSize: 14, color: '#9333ea', fontWeight: '500' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  cancelButton: { backgroundColor: '#9ca3af' },
  saveButton: { backgroundColor: '#16a34a' },
  deleteButton: { backgroundColor: '#ef4444' },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // --- SIDEBAR STYLES ---
  sidebarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  sidebar: { width: 320, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  sidebarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sidebarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  sidebarContent: { padding: 16 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8 },
  sidebarItemText: { fontSize: 16, color: '#111827', marginLeft: 16, flex: 1 },
  sidebarItemChevron: { marginLeft: 'auto' },
  sidebarDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },

  // --- PROFILE STYLES ---
  profileAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#9333ea', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
  profileAvatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  profileSection: { marginBottom: 20 },
  profileLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  profileInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#f9fafb' },
  profileStats: { flexDirection: 'row', gap: 16, marginTop: 24, marginBottom: 24 },
  profileStat: { flex: 1, backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  profileStatNumber: { fontSize: 28, fontWeight: 'bold', color: '#9333ea', marginBottom: 4 },
  profileStatLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  profileSaveButton: { backgroundColor: '#9333ea', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  profileSaveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // --- SETTINGS STYLES ---
  settingsSection: { marginBottom: 32 },
  settingsSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  settingsItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingsItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsItemIcon: { fontSize: 20 },
  settingsItemText: { fontSize: 16, color: '#111827' },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#d1d5db', padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: '#9333ea' },
  toggleCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleCircleActive: { transform: [{ translateX: 22 }] },
  settingsAboutText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  // --- CALENDAR STYLES ---
  calendarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
  calendarBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  calendarModal: { backgroundColor: '#fff', borderRadius: 24, width: '90%', maxWidth: 500, maxHeight: '80%', zIndex: 1001 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  calendarTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  calendarContent: { padding: 20 },
  
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  monthNav: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 20 },
  monthNavText: { fontSize: 24, color: '#9333ea', fontWeight: 'bold' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  
  dayLabels: { flexDirection: 'row', marginBottom: 12 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#6b7280' },
  
  calendarGrid: { gap: 8 },
  calendarRow: { flexDirection: 'row', gap: 8 },
  calendarDay: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#f9fafb', position: 'relative' },
  emptyDay: { backgroundColor: 'transparent' },
  dayNumber: { fontSize: 14, color: '#111827', fontWeight: '500' },
  currentDay: { backgroundColor: '#9333ea' },
  currentDayText: { color: '#fff', fontWeight: 'bold' },
  assignmentDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444', position: 'absolute', bottom: 6 },
  
  todaySection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  todaySectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  noAssignmentsText: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingVertical: 20 },
  
  miniTaskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 8 },
  miniTaskEmoji: { fontSize: 24, marginRight: 12 },
  miniTaskInfo: { flex: 1 },
  miniTaskTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  miniTaskCourse: { fontSize: 12, color: '#6b7280' },
  miniPriorityDot: { width: 8, height: 8, borderRadius: 4 },
});