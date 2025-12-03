// components/AddAssignmentModal.tsx
import React, {
  useState,
  useCallback,
} from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  X,
  Image as ImageIcon,
  Plus as PlusIcon,
  Trash2,
} from "lucide-react-native";

import {
  Draft,
  safeISO,
  useAssignments,
} from "./AssignmentsContext";
import { API_BASE } from "../constant/api";
import { colors } from "../constant/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type OcrItem = {
  title: string;
  due_date_raw?: string;
  due_date_iso?: string;
  assignment_type?: string;
  course?: string;
  page?: number | null;
  source?: string;
};

function nextDraftId(): string {
  return `da_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AddAssignmentModal({
  visible,
  onClose,
}: Props) {
  const { addAssignmentsFromDrafts } =
    useAssignments();

  const [courseName, setCourseName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [parsing, setParsing] = useState(false);

  const closeAll = () => {
    setCourseName("");
    setDrafts([]);
    onClose();
  };

  const makeDraftsFromItems = (
    items: OcrItem[]
  ) => {
    if (!items?.length) {
      Alert.alert(
        "No assignments found",
        "The extractor didn’t find any assignments in this image."
      );
      return;
    }

    const ds: Draft[] = items.map((it) => ({
      id: nextDraftId(),
      title: it.title || "Untitled",
      course: courseName || it.course || "",
      type: "Assignment", // You can remap from assignment_type if you like
      dueISO: safeISO(
        it.due_date_iso || it.due_date_raw || null
      ),
      description: "",
    }));

    setDrafts(ds);
  };

  const handleUploadImage = useCallback(
    async () => {
      const res =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0] as any;
      setParsing(true);
      try {
        const fd = new FormData();
        fd.append(
          "file",
          {
            uri: asset.uri,
            name:
              asset.fileName ||
              `image_${Date.now()}.jpg`,
            type: asset.type || "image/jpeg",
          } as any
        );

        const base =
          API_BASE.replace(/\/$/, "");
        const url = `${base}/assignments/image?preprocess=${encodeURIComponent(
          "screenshot"
        )}&use_llm=false`;
        console.log("ADD IMAGE →", url);

        const resp = await fetch(url, {
          method: "POST",
          body: fd,
        });

        if (!resp.ok) {
          console.log(
            "Add image resp not ok:",
            resp.status,
            resp.statusText
          );
          Alert.alert(
            "Upload failed",
            `HTTP ${resp.status} – ${resp.statusText}`
          );
          return;
        }

        let json: any;
        try {
          json = await resp.json();
        } catch (e: any) {
          console.log(
            "Add image JSON error:",
            e
          );
          Alert.alert(
            "Error",
            "Could not read server response."
          );
          return;
        }

        console.log(
          "ADD IMAGE resp →",
          JSON.stringify(json)
        );

        const items: OcrItem[] = Array.isArray(
          json?.items
        )
          ? json.items
          : [];

        makeDraftsFromItems(items);
      } catch (e: any) {
        console.log("Add image error:", e);
        Alert.alert(
          "Error",
          String(e?.message || e)
        );
      } finally {
        setParsing(false);
      }
    },
    [courseName]
  );

  const handleAddRow = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: nextDraftId(),
        title: "",
        course: courseName,
        type: "Assignment",
        dueISO: null,
        description: "",
      },
    ]);
  };

  const updateDraft = (
    id: string,
    field: keyof Draft,
    value: string | null
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) =>
      prev.filter((d) => d.id !== id)
    );
  };

  const handleSave = () => {
    if (!drafts.length) {
      closeAll();
      return;
    }

    const cleaned = drafts.map((d) => ({
      ...d,
      course: d.course || courseName,
      dueISO: safeISO(d.dueISO || null),
    }));

    addAssignmentsFromDrafts(cleaned);
    closeAll();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeAll}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              Add assignment(s)
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
            Upload an image of your assignment
            list or add rows manually, then
            save them to your schedule.
          </Text>

          {/* Class name */}
          <Text style={styles.label}>
            Class name
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., CS 326 – Software Dev"
            placeholderTextColor={
              colors.textSecondary + "99"
            }
            value={courseName}
            onChangeText={setCourseName}
          />

          {/* Actions row: upload + add manual row */}
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={styles.fileBtn}
              onPress={handleUploadImage}
              disabled={parsing}
            >
              <ImageIcon
                size={18}
                color={colors.textPrimary}
              />
              <Text
                style={styles.fileBtnText}
              >
                {parsing
                  ? "Parsing…"
                  : "Upload image"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fileBtn}
              onPress={handleAddRow}
              disabled={parsing}
            >
              <PlusIcon
                size={18}
                color={colors.textPrimary}
              />
              <Text
                style={styles.fileBtnText}
              >
                Add row
              </Text>
            </TouchableOpacity>
          </View>

          {/* Draft list */}
          <ScrollView
            style={{ maxHeight: 320 }}
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
                  placeholder="Homework 5, Project draft, Quiz 2..."
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
                  placeholder="e.g., CS 326"
                  placeholderTextColor={
                    colors.textSecondary +
                    "99"
                  }
                />

                <Text
                  style={styles.cardLabel}
                >
                  Due date (YYYY-MM-DD or
                  MM/DD/YYYY)
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
                  placeholder="2025-12-01 or 12/01/2025"
                  placeholderTextColor={
                    colors.textSecondary +
                    "99"
                  }
                />

                <Text
                  style={styles.cardLabel}
                >
                  Notes (optional)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 70 },
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
                  placeholder="Any extra details…"
                  placeholderTextColor={
                    colors.textSecondary +
                    "99"
                  }
                />
              </View>
            ))}

            {drafts.length === 0 && (
              <Text
                style={{
                  color:
                    colors.textSecondary,
                  marginTop: 10,
                }}
              >
                No assignments yet. Upload an
                image or tap “Add row” to get
                started.
              </Text>
            )}
          </ScrollView>

          {/* Footer buttons */}
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
              onPress={handleSave}
              disabled={parsing}
            >
              <Text
                style={styles.primaryText}
              >
                Save assignments
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    marginBottom: 10,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rowButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  fileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fileBtnText: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
  },
  primaryBtn: {
    backgroundColor: colors.blue,
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
  },
});
