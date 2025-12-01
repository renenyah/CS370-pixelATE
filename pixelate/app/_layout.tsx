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
import { AssignmentsProvider } from "../components/AssignmentsContext";
import { colors } from "../constant/colors";

const AUTH_ROUTES = ["/login", "/signup"];
export const NAV_HEIGHT = 88;

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [plusOpen, setPlusOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  return (
    <AssignmentsProvider>
      <View style={{ flex: 1 }}>
        {/* All screens */}
        <Stack screenOptions={{ headerShown: false }} />

        {/* Quick actions (only on main app screens) */}
        {!isAuthRoute && plusOpen && (
          <PlusMenu
            onClose={() => setPlusOpen(false)}
            onUploadSyllabus={() => {
              setPlusOpen(false);
              setUploadOpen(true);
            }}
            onAddClass={() => {
              setPlusOpen(false);
              // later: navigate to a "new class" screen
            }}
            onAddAssignment={() => {
              setPlusOpen(false);
              // later: navigate to a "new assignment" screen
            }}
          />
        )}

        {/* Upload syllabus lives at root so it doesn’t depend on PlusMenu being mounted */}
        {!isAuthRoute && (
          <UploadSyllabusModal
            visible={uploadOpen}
            onClose={() => setUploadOpen(false)}
          />
        )}

        {/* Bottom nav (hidden on login/signup) */}
        {!isAuthRoute && (
          <View style={styles.navBar}>
            <NavItem
              label="Home"
              Icon={HomeIcon}
              active={pathname === "/home" || pathname === "/"}
              onPress={() => {
                setPlusOpen(false);
                setUploadOpen(false);
                router.push("/home");
              }}
            />

            <NavItem
              label="Classes"
              Icon={FolderIcon}
              active={pathname === "/classes"}
              onPress={() => {
                setPlusOpen(false);
                setUploadOpen(false);
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
                setPlusOpen(false);
                setUploadOpen(false);
                router.push("/calendar");
              }}
            />

            <NavItem
              label="Profile"
              Icon={UserIcon}
              active={pathname === "/profile"}
              onPress={() => {
                setPlusOpen(false);
                setUploadOpen(false);
                router.push("/profile");
              }}
            />
          </View>
        )}
      </View>
    </AssignmentsProvider>
  );
}

type NavItemProps = {
  label: string;
  Icon: any;
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
 { NAV_HEIGHT };
