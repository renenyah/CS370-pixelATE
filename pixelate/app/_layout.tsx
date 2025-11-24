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
import { AssignmentsProvider } from "../components/AssignmentsContext";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [plusOpen, setPlusOpen] = useState(false);

  // Hide nav + plus menu on login / signup screens
  const isAuthRoute =
    pathname === "/login" || pathname === "/signup";

  return (
    <AssignmentsProvider>
      <View style={{ flex: 1 }}>
        {/* Expo Router handles all screens from app/ */}
        <Stack screenOptions={{ headerShown: false }} />

        {/* Only show PlusMenu + bottom nav when NOT on auth screens */}
        {!isAuthRoute && (
          <>
            {plusOpen && (
              <PlusMenu onClose={() => setPlusOpen(false)} />
            )}

            <View style={styles.navBar}>
              <NavItem
                label="Home"
                Icon={HomeIcon}
                active={pathname === "/home"}
                onPress={() => {
                  setPlusOpen(false);
                  router.push("/home");
                }}
              />

              <NavItem
                label="Classes"
                Icon={FolderIcon}
                active={pathname === "/classes"}
                onPress={() => {
                  setPlusOpen(false);
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
                  router.push("/calendar");
                }}
              />

              <NavItem
                label="Profile"
                Icon={UserIcon}
                active={pathname === "/profile"}
                onPress={() => {
                  setPlusOpen(false);
                  router.push("/profile");
                }}
              />
            </View>
          </>
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
      <Icon size={24} color={active ? "#7C3AED" : "#E5E7EB"} />
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

const NAV_HEIGHT = 88;

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
    color: "#7C3AED",
    fontWeight: "700",
  },
  plusButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
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

export { NAV_HEIGHT };
