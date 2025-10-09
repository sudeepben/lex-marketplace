"use client";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = { user: User | null; loading: boolean; signOutNow: () => Promise<void> };
const AuthCtx = createContext<AuthContextType>({ user: null, loading: true, signOutNow: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
  }, []);

  async function signOutNow() { await signOut(auth); }

  return <AuthCtx.Provider value={{ user, loading, signOutNow }}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx); }