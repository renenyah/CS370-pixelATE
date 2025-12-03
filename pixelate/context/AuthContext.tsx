// context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import * as Linking from "expo-linking";
import { supabase } from "../constant/supabase";

interface AuthResponse {
  data?: any;
  error?: any;
}

interface AuthErrorResponse {
  error?: any;
}

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<AuthErrorResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: any } }) => {
        const { session } = data;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,

    // ------------ SIGN UP ------------
    signUp: async (email, password, fullName) => {
      // Hardcode the Expo Go URL for now (change this IP if your dev server IP changes)
      const redirectUrl = "exp://10.44.163.76:8081/";
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName
            ? {
                full_name: fullName,
              }
            : undefined,
        },
      });

      return { data, error };
    },

    // ------------ SIGN IN ------------
    signIn: async (email, password) => {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      return { data, error };
    },

    // ------------ SIGN OUT ------------
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },

    // ------------ RESET PASSWORD ------------
    resetPassword: async (email) => {
      const redirectUrl = Linking.createURL("/reset-password");
      
      const { data, error } =
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
      return { data, error };
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};