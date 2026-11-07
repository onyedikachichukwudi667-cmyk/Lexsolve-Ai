"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface Row { id: string; question: string; method: string; depth: string; version: number; at?: number }

export default function History() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    if (!user) return;
    const s = await getDocs(query(collection(db, "users", user.uid, "answers"), orderBy("createdAt", "desc"), limit(100))).catch(() => null);
    if (s) setRows(s.docs.map((d) => { const x = d.data(); return { id: d.id, question: String(x.question).slice(0, 140), method: x.method, depth: x.depth, version: x.version || 1, at: x.createdAt?.seconds }; }));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  return (
    <div className="space-y-3">
      <h1 className="font-heading text-2xl font-semibold text-navy">Answer History</h1>
      {rows.length === 0 && <p className="text-sm text-muted">No answers yet.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card text-sm">
          <Link href={`/history/${r.id}`} className="block">
            <p className="mb-1 text-xs text-muted">{r.method} | {r.depth} | v{r.version} {r.at ? "| " + new Date(r.at * 1000).toLocaleString() : ""}</p>
            <p>{r.question}...</p>
          </Link>
          <button className="mt-2 text-xs text-red-700 underline" onClick={async () => { if (user && confirm("Delete this answer?")) { await deleteDoc(doc(db, "users", user.uid, "answers", r.id)); load(); } }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
