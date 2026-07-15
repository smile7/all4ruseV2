"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "~/lib/supabase/client";

type AuthContextType = {
  userId: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type Props = {
  userId: string | null;
  children: React.ReactNode;
};

export function AuthProvider({ userId: serverUserId, children }: Props) {
  // undefined = no browser override yet; fall back to the server-hydrated user id.
  const [browserUserId, setBrowserUserId] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setBrowserUserId(null);
        return;
      }

      if (session?.user?.id) {
        setBrowserUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = browserUserId !== undefined ? browserUserId : serverUserId;

  return (
    <AuthContext.Provider value={{ userId }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
