"use client";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { ManualAuthority } from "@/lib/types";

const blank = { kind: "case" as "case" | "statute", name: "", citation: "", court: "", year: "", section: "", facts: "", issues: "", holding: "", ratio: "", notes: "" };

export default function Authorities() {
  const { user } = useAuth();
  const [list, setList] = useState<ManualAuthority[]>([]);
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank, v: string) => setF({ ...f, [k]: v });
  const load = async () => {
    if (!user) return;
    const s = await getDocs(collection(db, "users", user.uid, "authorities")).catch(() => null);
    if (s) setList(s.docs.map((d) => ({ ...(d.data() as ManualAuthority), id: d.id })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const data: Record<string, unknown> = { kind: f.kind, name: f.name.trim() };
    (["citation", "court", "section", "facts", "issues", "holding", "ratio", "notes"] as const).forEach((k) => f[k].trim() && (data[k] = f[k].trim()));
    if (f.year && Number(f.year)) data.year = Number(f.year);
    await addDoc(collection(db, "users", user.uid, "authorities"), data);
    setF(blank);
    load();
  }

  const T = (k: keyof typeof blank, label: string, rows = 0) => (
    <div><label className="label">{label}</label>{rows ? <textarea className="field" rows={rows} value={f[k]} onChange={(e) => set(k, e.target.value)} /> : <input className="field" value={f[k]} onChange={(e) => set(k, e.target.value)} />}</div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-navy">My Authorities</h1>
      <p className="text-sm text-muted">Authorities you add here are marked "User provided" and are never replaced by the research engine.</p>
      <form onSubmit={save} className="card space-y-3">
        <select className="field" value={f.kind} onChange={(e) => set("kind", e.target.value)}><option value="case">Case</option><option value="statute">Statutory provision</option></select>
        {T("name", f.kind === "case" ? "Case name" : "Name of legislation")}
        {T("citation", "Citation")}
        <div className="grid grid-cols-2 gap-3">{T("court", "Court")}{T("year", "Year")}</div>
        {f.kind === "statute" && T("section", "Section")}
        {T("facts", "Facts", 3)}
        {T("issues", "Issues", 2)}
        {T("holding", "Holding", 2)}
        {T("ratio", "Ratio / principle", 3)}
        <button className="btn btn-primary w-full" disabled={!f.name.trim()}>Save authority</button>
      </form>
      {list.map((a) => (
        <div key={a.id} className="card flex items-start justify-between gap-3 text-sm">
          <div><p className="font-semibold text-navy">{a.name}</p><p className="text-muted">{[a.citation, a.court, a.year].filter(Boolean).join(" | ")}</p></div>
          <button className="text-red-700 underline" onClick={async () => { if (user) { await deleteDoc(doc(db, "users", user.uid, "authorities", a.id)); load(); } }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
