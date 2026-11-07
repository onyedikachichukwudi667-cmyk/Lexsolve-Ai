"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

interface Ctx {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  token: () => Promise<string>;
}
const AuthCtx = createContext<Ctx>({ user: null, loading: true, isAdmin: false, token: async () => "" });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          try {
            await setDoc(
              doc(db, "users", u.uid),
              { displayName: u.displayName || "", email: u.email || "", lastSeen: serverTimestamp() },
              { merge: true }
            );
            setIsAdmin((await getDoc(doc(db, "admins", u.uid))).exists());
          } catch {
            setIsAdmin(false);
          }
        } else setIsAdmin(false);
        setLoading(false);
      }),
    []
  );

  const token = async () => (auth.currentUser ? auth.currentUser.getIdToken() : "");
  return <AuthCtx.Provider value={{ user, loading, isAdmin, token }}>{children}</AuthCtx.Provider>;
}
