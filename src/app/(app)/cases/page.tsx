"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Authority } from "@/lib/types";
import { AuthorityCard } from "@/components/AuthorityCard";

// Case Explorer: every authority discovered or supplied across your answers, de-duplicated.
export default function Cases() {
  const { user } = useAuth();
  const [items, setItems] = useState<Authority[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "users", user.uid, "answers"), orderBy("createdAt", "desc"), limit(40))).then((s) => {
      const map = new Map<string, Authority>();
      s.docs.forEach((d) => (d.data().result?.authorities || []).forEach((a: Authority) => {
        const k = (a.name + (a.citation || "")).toLowerCase();
        if (!map.has(k)) map.set(k, a);
      }));
      setItems([...map.values()]);
    }).catch(() => {});
  }, [user]);

  const shown = items.filter((a) => (a.name + " " + (a.citation || "")).toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-3">
      <h1 className="font-heading text-2xl font-semibold text-navy">Case Explorer</h1>
      <input className="field" placeholder="Filter by name or citation" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {shown.length === 0 && <p className="text-sm text-muted">Authorities from your answers will appear here.</p>}
      {shown.map((a, i) => <AuthorityCard key={i} a={a} />)}
    </div>
  );
}
