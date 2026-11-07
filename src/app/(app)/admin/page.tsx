"use client";
import { useEffect, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEFAULT_SETTINGS } from "@/lib/config";

interface Status { ai: { keySet: boolean; baseUrl: string; model: string; embedModel: string }; sources: { id: string; name: string; configured: boolean }[] }
interface Fb { id: string; message: string; email?: string; resolved?: boolean }

export default function Admin() {
  const { user, isAdmin, token } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [fb, setFb] = useState<Fb[]>([]);
  const [s, setS] = useState({ ...DEFAULT_SETTINGS, model: "" });
  const [disabled, setDisabled] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user || !isAdmin) return;
    (async () => {
      const r = await fetch("/api/admin/status", { headers: { authorization: `Bearer ${await token()}` } });
      if (r.ok) setStatus(await r.json());
      getDocs(query(collection(db, "users"), limit(200))).then((x) => setUsers(x.docs.map((d) => ({ id: d.id, email: String(d.data().email || "") })))).catch(() => {});
      getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(50))).then((x) => setFb(x.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Fb, "id">) })))).catch(() => {});
      getDocs(collection(db, "settings")).then((x) => { const g = x.docs.find((d) => d.id === "global")?.data(); if (g) { setS({ ...DEFAULT_SETTINGS, model: "", ...g } as typeof s); setDisabled((g.disabledSources || []).join(",")); } }).catch(() => {});
    })();
  }, [user, isAdmin]);

  if (!isAdmin) return <p className="text-muted">You do not have access to this page.</p>;

  async function save() {
    await setDoc(doc(db, "settings", "global"), {
      rateLimitPerMinute: Number(s.rateLimitPerMinute) || 6,
      maxQuestionChars: Number(s.maxQuestionChars) || 12000,
      model: s.model || "",
      disabledSources: disabled.split(",").map((x) => x.trim()).filter(Boolean),
    });
    setMsg("Settings saved. They apply to the next request.");
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-semibold text-navy">Admin Dashboard</h1>
      <section className="card space-y-1 text-sm">
        <h2 className="font-heading text-lg font-semibold text-navy">Integrations</h2>
        {status ? (<>
          <p>AI key: {status.ai.keySet ? "set" : "MISSING"} | model: {status.ai.model} | embeddings: {status.ai.embedModel}</p>
          <p className="text-muted">{status.ai.baseUrl}</p>
          {status.sources.map((x) => <p key={x.id}>{x.name}: {x.configured ? "configured" : "not configured"}</p>)}
        </>) : <p className="text-muted">Loading...</p>}
      </section>
      <section className="card space-y-3">
        <h2 className="font-heading text-lg font-semibold text-navy">Research and usage settings</h2>
        <div><label className="label">Requests per minute per user</label><input className="field" type="number" value={s.rateLimitPerMinute} onChange={(e) => setS({ ...s, rateLimitPerMinute: Number(e.target.value) })} /></div>
        <div><label className="label">Max question characters</label><input className="field" type="number" value={s.maxQuestionChars} onChange={(e) => setS({ ...s, maxQuestionChars: Number(e.target.value) })} /></div>
        <div><label className="label">Model override (blank uses server default)</label><input className="field" value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} /></div>
        <div><label className="label">Disabled source ids (comma separated)</label><input className="field" value={disabled} onChange={(e) => setDisabled(e.target.value)} placeholder="openlegal" /></div>
        <button className="btn btn-primary w-full" onClick={save}>Save settings</button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </section>
      <section className="card text-sm">
        <h2 className="font-heading text-lg font-semibold text-navy">Users ({users.length})</h2>
        {users.map((u) => <p key={u.id} className="text-muted">{u.email || u.id}</p>)}
      </section>
      <section className="card text-sm">
        <h2 className="font-heading text-lg font-semibold text-navy">Feedback and error reports</h2>
        {fb.length === 0 && <p className="text-muted">None.</p>}
        {fb.map((x) => (
          <div key={x.id} className="mt-2 border-t border-line pt-2">
            <p>{x.message}</p><p className="text-xs text-muted">{x.email}</p>
            <button className="text-xs underline" onClick={async () => { await updateDoc(doc(db, "feedback", x.id), { resolved: true }); setFb(fb.filter((y) => y.id !== x.id)); }}>Mark resolved</button>{" "}
            <button className="text-xs text-red-700 underline" onClick={async () => { await deleteDoc(doc(db, "feedback", x.id)); setFb(fb.filter((y) => y.id !== x.id)); }}>Delete</button>
          </div>
        ))}
      </section>
    </div>
  );
}
