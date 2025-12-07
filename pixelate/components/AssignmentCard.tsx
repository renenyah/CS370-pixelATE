import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../constant/supabase";

type SupaUser = NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>;

type AuthContextValue = {
  user: SupaUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ensure user_settings row exists
  const ensureUserSettings = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_settings")
      .select("user_id, has_seen_tour")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.log("[user_settings] select error", error);
      return;
    }

    if (!data) {
      const { error: insertError } = await supabase.from("user_settings").insert({
        user_id: userId,
        has_seen_tour: false,
      });
      if (insertError) {
        console.log("[user_settings] insert error", insertError);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (!error && data?.user) {
        setUser(data.user);
        await ensureUserSettings(data.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await ensureUserSettings(u.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const u = result.data.user;
    if (u) {
      await ensureUserSettings(u.id);
    }
    return result;
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name ? { full_name: name } : {},
        emailRedirectTo: process.env.EXPO_PUBLIC_REDIRECT_URL,
      },
    });

    const u = result.data.user;
    if (u) {
      await ensureUserSettings(u.id);
    }

    return result;
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
    }
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
