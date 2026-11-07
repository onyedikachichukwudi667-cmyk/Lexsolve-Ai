"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ answers: 0, library: 0, authorities: 0 });
  const [recent, setRecent] = useState<{ id: string; question: string; method: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = async (n: string) => (await getCountFromServer(collection(db, "users", user.uid, n))).data().count;
        setCounts({ answers: await c("answers"), library: await c("library"), authorities: await c("authorities") });
        const snap = await getDocs(query(collection(db, "users", user.uid, "answers"), orderBy("createdAt", "desc"), limit(4)));
        setRecent(snap.docs.map((d) => ({ id: d.id, question: String(d.data().question).slice(0, 110), method: d.data().method })));
      } catch {
        /* empty state is fine */
      }
    })();
  }, [user]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-navy">Hello{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}</h1>
        <p className="text-muted">What would you like to research today?</p>
      </div>
      <Link href="/solver" className="btn btn-gold w-full">Solve a problem question</Link>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["Answers", counts.answers], ["Library docs", counts.library], ["My authorities", counts.authorities]].map(([l, n]) => (
          <div key={String(l)} className="card"><p className="text-2xl font-semibold text-navy">{n}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
      <section>
        <h2 className="mb-2 font-heading text-lg font-semibold text-navy">Recent answers</h2>
        {recent.length === 0 && <p className="text-sm text-muted">Nothing yet. Your answers will appear here.</p>}
        <div className="space-y-2">
          {recent.map((r) => (
            <Link key={r.id} href={`/history/${r.id}`} className="card block text-sm">
              <span className="mr-2 rounded bg-navy px-1.5 py-0.5 text-xs text-white">{r.method}</span>{r.question}...
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
