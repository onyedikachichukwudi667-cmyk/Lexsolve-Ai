"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface Q { id: string; title: string; question: string }

export default function Saved() {
  const { user } = useAuth();
  const [list, setList] = useState<Q[]>([]);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const load = async () => {
    if (!user) return;
    const s = await getDocs(collection(db, "users", user.uid, "saved")).catch(() => null);
    if (s) setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Q, "id">) })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-navy">Saved Questions</h1>
      <form className="card space-y-2" onSubmit={async (e) => { e.preventDefault(); if (!user) return; await addDoc(collection(db, "users", user.uid, "saved"), { title, question, createdAt: Date.now() }); setTitle(""); setQuestion(""); load(); }}>
        <input className="field" required maxLength={120} placeholder="Title (e.g. Offer and acceptance, 2024 exam)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="field min-h-[110px]" required minLength={20} maxLength={12000} placeholder="Problem question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button className="btn btn-primary w-full">Save question</button>
      </form>
      {list.map((q) => (
        <div key={q.id} className="card text-sm">
          <p className="font-semibold text-navy">{q.title}</p>
          <p className="line-clamp-3 text-muted">{q.question}</p>
          <div className="mt-2 flex gap-4"><Link className="underline" href={`/solver?saved=${q.id}`}>Solve</Link><button className="text-red-700 underline" onClick={async () => { if (user) { await deleteDoc(doc(db, "users", user.uid, "saved", q.id)); load(); } }}>Delete</button></div>
        </div>
      ))}
    </div>
  );
}
