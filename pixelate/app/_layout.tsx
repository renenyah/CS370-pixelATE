// app/_layout.tsx
import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import {
  Home as HomeIcon,
  Folder as FolderIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Plus,
} from "lucide-react-native";

import PlusMenu from "../components/PlusMenu";
import UploadSyllabusModal from "../components/UploadSyllabusModal";
import AddAssignmentModal from "../components/AddAssignmentModal";
import DraftEditorModal from "../components/DraftEditorModal";
import AddClassModal from "../components/AddClassModal"; // ✅ NEW

import {
  AssignmentsProvider,
  useAssignments,
  Draft,
} from "../components/AssignmentsContext";
import { AuthProvider } from "../context/AuthContext";
import { colors } from "../constant/colors";

const AUTH_ROUTES = ["/login", "/signup"];
export const NAV_HEIGHT = 88;

function InnerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { addAssignmentsFromDrafts } = useAssignments();

  const [plusOpen, setPlusOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [addAssignmentOpen, setAddAssignmentOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false); // ✅ NEW

  const [draftEditorOpen, setDraftEditorOpen] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<Draft[] | null>(null);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  const handleDraftsFromImage = (drafts: Draft[]) => {
    if (!drafts || !drafts.length) return;
    setPendingDrafts(drafts);
    setDraftEditorOpen(true);
  };

  const handleSaveDrafts = (drafts: Draft[]) => {
    if (drafts && drafts.length) {
      addAssignmentsFromDrafts(drafts);
    }
    setDraftEditorOpen(false);
    setPendingDrafts(null);
  };

  const closeAllModals = () => {
    setPlusOpen(false);
    setUploadOpen(false);
    setAddAssignmentOpen(false);
    setAddClassOpen(false);       // ✅ make sure class modal closes too
    setDraftEditorOpen(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* All screens in the app */}
      <Stack screenOptions={{ headerShown: false }} />

      {/* + menu */}
      {!isAuthRoute && plusOpen && (
        <PlusMenu
          onClose={() => setPlusOpen(false)}
          onUploadSyllabus={() => {
            setPlusOpen(false);
            setUploadOpen(true);
          }}
          onAddClass={() => {
            setPlusOpen(false);
            setAddClassOpen(true);     // ✅ open AddClassModal instead of routing
          }}
          onAddAssignment={() => {
            setPlusOpen(false);
            setAddAssignmentOpen(true);
          }}
        />
      )}

      {/* Upload syllabus modal */}
      {!isAuthRoute && (
        <UploadSyllabusModal
          visible={uploadOpen}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {/* Add class modal ✅ NEW */}
      {!isAuthRoute && (
        <AddClassModal
          visible={addClassOpen}
          onClose={() => setAddClassOpen(false)}
        />
      )}

      {/* Add single assignment modal */}
      {!isAuthRoute && (
        <AddAssignmentModal
          visible={addAssignmentOpen}
          onClose={() => setAddAssignmentOpen(false)}
          onDraftsExtracted={handleDraftsFromImage}
        />
      )}

      {/* Draft editor modal (for image-parsed assignments) */}
      {!isAuthRoute && (
        <DraftEditorModal
          visible={draftEditorOpen}
          initialDrafts={pendingDrafts || []}
          onClose={() => {
            setDraftEditorOpen(false);
            setPendingDrafts(null);
          }}
          onSave={handleSaveDrafts}
        />
      )}

      {/* Bottom nav bar */}
      {!isAuthRoute && (
        <View style={styles.navBar}>
          <NavItem
            label="Home"
            Icon={HomeIcon}
            active={pathname === "/home"}
            onPress={() => {
              closeAllModals();
              router.push("/home");
            }}
          />

          <NavItem
            label="Classes"
            Icon={FolderIcon}
            active={pathname === "/classes"}
            onPress={() => {
              closeAllModals();
              router.push("/classes");
            }}
          />

          <TouchableOpacity
            style={styles.plusButton}
            activeOpacity={0.9}
            onPress={() => setPlusOpen((prev) => !prev)}
          >
            <Plus size={28} color="#fff" />
          </TouchableOpacity>

          <NavItem
            label="Calendar"
            Icon={CalendarIcon}
            active={pathname === "/calendar"}
            onPress={() => {
              closeAllModals();
              router.push("/calendar");
            }}
          />

          <NavItem
            label="Profile"
            Icon={UserIcon}
            active={pathname === "/profile"}
            onPress={() => {
              closeAllModals();
              router.push("/profile");
            }}
          />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AssignmentsProvider>
        <InnerLayout />
      </AssignmentsProvider>
    </AuthProvider>
  );
}

type NavItemProps = {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  active: boolean;
  onPress: () => void;
};

function NavItem({ label, Icon, active, onPress }: NavItemProps) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon
        size={24}
        color={active ? colors.lavender : "#E5E7EB"}
      />
      <Text
        style={[
          styles.navText,
          active && styles.navTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: NAV_HEIGHT,
    backgroundColor: "#0B1220",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
  },
  navText: {
    color: "#E5E7EB",
    fontSize: 12,
    marginTop: 4,
  },
  navTextActive: {
    color: colors.lavender,
    fontWeight: "700",
  },
  plusButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
