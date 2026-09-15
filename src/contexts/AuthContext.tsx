"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "~/lib/supabase/client";

type AuthContextType = {
  user: User | null;
  userId: string | null;
  username: string | undefined;
  /** True until the first auth state resolves, so consumers can avoid a logged-out flash. */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

/**
 * The single place the session is resolved. Runs in the browser only: reading
 * it on the server would touch cookies in the root layout, which opts every
 * page out of static rendering.
 */
export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    async function loadUsername(userId: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      if (!cancelled) setUsername(profile?.username ?? undefined);
    }

    // `INITIAL_SESSION` fires on subscribe (with a null session when signed
    // out), so no separate getUser() call is needed to seed the state.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (cancelled) return;

      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setIsLoading(false);

      if (nextUser) {
        void loadUsername(nextUser.id);
      } else {
        setUsername(undefined);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, userId: user?.id ?? null, username, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
