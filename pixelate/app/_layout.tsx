// app/_layout.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import * as Linking from "expo-linking";
import {
  Home as HomeIcon,
  Folder as FolderIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Plus,
} from "lucide-react-native";

import PlusMenu from "../components/PlusMenu";
import UploadSyllabusModal from "../components/UploadSyllabusModal";
import AddClassModal from "../components/AddClassModal";
import AddAssignmentModal from "../components/AddAssignmentModal";
import { AssignmentsProvider } from "../components/AssignmentsContext";
import { AuthProvider } from "../context/AuthContext";
import { colors } from "../constant/colors";
import { supabase } from "../constant/supabase"; // Import your supabase client

const AUTH_ROUTES = ["/login", "/signup"];
export const NAV_HEIGHT = 88;

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [plusOpen, setPlusOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Deep link handler for email confirmation
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("Deep link received:", url);
      
      try {
        // Supabase puts tokens in the hash fragment (#), not query params (?)
        // Extract everything after the # symbol
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) {
          console.log("No hash fragment found in URL");
          return;
        }
        
        const hash = url.substring(hashIndex + 1);
        console.log("Hash fragment:", hash);
        
        const params = new URLSearchParams(hash);
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        
        console.log("Access token exists:", !!access_token);
        console.log("Refresh token exists:", !!refresh_token);
        
        if (access_token && refresh_token) {
          console.log("Setting session...");
          
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (error) {
            console.error("Error setting session:", error.message);
            return;
          }
          
          if (data?.session) {
            console.log("User email verified successfully! Redirecting to home...");
            // User is now authenticated and email is confirmed
            // Navigate to home - they're logged in!
            router.replace("/home");
          } else {
            console.log("No session in response data");
          }
        } else {
          console.log("Missing tokens in URL");
        }
      } catch (err) {
        console.error("Error in handleDeepLink:", err);
      }
    };

    // Listen for URL events (when app is already open)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened via a deep link (when app was closed)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <AuthProvider>
      <AssignmentsProvider>
        <View style={{ flex: 1 }}>
          {/* All screens in the app */}
          <Stack screenOptions={{ headerShown: false }} />

          {/* + menu (only on main app screens, not login/signup) */}
          {!isAuthRoute && plusOpen && (
            <PlusMenu
              onClose={() => setPlusOpen(false)}
              onUploadSyllabus={() => {
                setPlusOpen(false);
                setUploadOpen(true);
              }}
              onAddClass={() => {
                setPlusOpen(false);
                setShowAddClassModal(true);
              }}
              onAddAssignment={() => {
                setPlusOpen(false);
                setShowAddAssignmentModal(true);
              }}
            />
          )}

          {/* Upload syllabus modal (centered) */}
          {!isAuthRoute && (
            <UploadSyllabusModal
              visible={uploadOpen}
              onClose={() => setUploadOpen(false)}
            />
          )}

          {/* Add class folder modal (same position as upload syllabus) */}
          {!isAuthRoute && (
            <AddClassModal
              visible={showAddClassModal}
              onClose={() => setShowAddClassModal(false)}
            />
          )}

          {/* Add assignment modal (same position as upload syllabus) */}
          {!isAuthRoute && (
            <AddAssignmentModal
              visible={showAddAssignmentModal}
              onClose={() => setShowAddAssignmentModal(false)}
            />
          )}

          {/* Bottom nav bar (hidden on login/signup) */}
          {!isAuthRoute && (
            <View style={styles.navBar}>
              <NavItem
                label="Home"
                Icon={HomeIcon}
                active={pathname === "/home" || pathname === "/"}
                onPress={() => {
                  setPlusOpen(false);
                  setUploadOpen(false);
                  setShowAddClassModal(false);
                  setShowAddAssignmentModal(false);
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
                  setShowAddClassModal(false);
                  setShowAddAssignmentModal(false);
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
                  setShowAddClassModal(false);
                  setShowAddAssignmentModal(false);
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
                  setShowAddClassModal(false);
                  setShowAddAssignmentModal(false);
                  router.push("/profile");
                }}
              />
            </View>
          )}
        </View>
      </AssignmentsProvider>
    </AuthProvider>
  );
}

type NavItemProps = {
  label: string;
  Icon: React.ComponentType<{
    size: number;
    color: string;
  }>;
  active: boolean;
  onPress: () => void;
};

function NavItem({ label, Icon, active, onPress }: NavItemProps) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <Icon size={24} color={active ? colors.lavender : "#E5E7EB"} />
      <Text style={[styles.navText, active && styles.navTextActive]}>
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