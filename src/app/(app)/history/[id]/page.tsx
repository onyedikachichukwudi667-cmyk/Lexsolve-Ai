"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEPTH, type Depth } from "@/lib/config";
import type { AnswerRecord, ManualAuthority, Method } from "@/lib/types";
import { runSolve, saveAnswer } from "@/lib/client/solve";
import { topPassages } from "@/lib/client/library";
import { AnswerView } from "@/components/AnswerView";
import { ResearchPanel } from "@/components/ResearchPanel";
import type { StreamEvent } from "@/lib/types";

type StageEvent = Extract<StreamEvent, { type: "stage" }>;

export default function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const router = useRouter();
  const [rec, setRec] = useState<AnswerRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<Method>("IRAC");
  const [depth, setDepth] = useState<Depth>("standard");
  const [extra, setExtra] = useState("");
  const [mine, setMine] = useState<ManualAuthority[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "answers", id)).then((d) => {
      if (!d.exists()) return setMissing(true);
      const r = { id: d.id, ...(d.data() as Omit<AnswerRecord, "id">) } as AnswerRecord;
      setRec(r);
      setMethod(r.method);
      setDepth(r.depth);
      setExtra(r.instructions || "");
    }).catch(() => setMissing(true));
    getDocs(collection(db, "users", user.uid, "authorities")).then((s) => setMine(s.docs.map((x) => ({ ...(x.data() as ManualAuthority), id: x.id })))).catch(() => {});
  }, [user, id]);

  async function regenerate(over?: { depth?: Depth }) {
    if (!user || !rec) return;
    setBusy(true); setErr(""); setEvents([]); setNote("");
    try {
      const t = await token();
      const d = over?.depth || depth;
      const libraryPassages = await topPassages(user.uid, t, rec.question).catch(() => []);
      // Keep authorities the student supplied earlier, plus any newly picked ones.
      const earlier: ManualAuthority[] = rec.result.authorities.filter((a) => a.origin === "user").map((a) => ({ id: a.id.replace("usr-", ""), kind: a.kind, name: a.name, citation: a.citation, court: a.court, year: a.year, section: a.section, notes: a.summary, holding: a.principle }));
      const merged = [...earlier, ...mine.filter((m) => picked.includes(m.id) && !earlier.some((e) => e.id === m.id))];
      const result = await runSolve(t, { question: rec.question, subject: rec.subject, jurisdiction: rec.jurisdiction, method, depth: d, instructions: extra || undefined, userAuthorities: merged, libraryPassages, attachedDocs: [] }, (e) => e.type === "stage" && setEvents((p) => [...p, e]));
      const next = { parentId: rec.parentId || rec.id, version: rec.version + 1, question: rec.question, subject: rec.subject, jurisdiction: rec.jurisdiction, method, depth: d, instructions: extra || undefined, result };
      const newId = await saveAnswer(user.uid, next);
      router.push(`/history/${newId}`);
    } catch (e: any) {
      setErr(e.message || "Could not regenerate.");
    }
    setBusy(false);
  }

  async function verify() {
    if (!rec || !user) return;
    setBusy(true); setNote("");
    try {
      const res = await fetch("/api/verify", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ authorities: rec.result.authorities }) });
      const j = await res.json();
      if (res.ok) {
        setRec({ ...rec, result: { ...rec.result, authorities: j.authorities } });
        setNote(j.note);
      } else setNote(j.error || "Verification failed.");
    } catch { setNote("Could not reach the verification service."); }
    setBusy(false);
  }

  if (missing) return <p className="text-muted">Answer not found.</p>;
  if (!rec) return <p className="text-muted">Loading...</p>;

  return (
    <div className="space-y-5">
      {note && <p className="rounded-lg border border-line bg-gold-soft p-3 text-sm">{note}</p>}
      {busy && events.length > 0 && <ResearchPanel events={events} running={busy} />}
      {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
      <AnswerView record={rec} busy={busy} onSearchMore={() => regenerate({ depth: "deep" })} onVerify={verify} />
      <section className="card space-y-3">
        <h2 className="font-heading text-lg font-semibold text-navy">Regenerate</h2>
        <p className="text-sm text-muted">Creates a new version. Earlier versions are kept in your history.</p>
        <div className="grid grid-cols-2 gap-3">
          <select className="field" value={method} onChange={(e) => setMethod(e.target.value as Method)}><option>IRAC</option><option>IPAC</option></select>
          <select className="field" value={depth} onChange={(e) => setDepth(e.target.value as Depth)}>{(Object.keys(DEPTH) as Depth[]).map((d) => <option key={d} value={d}>{DEPTH[d].label}</option>)}</select>
        </div>
        <textarea className="field min-h-[70px]" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Additional instructions" />
        {mine.length > 0 && <div className="space-y-1">{mine.map((m) => <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(m.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />Add: {m.name}</label>)}</div>}
        <button className="btn btn-primary w-full" disabled={busy} onClick={() => regenerate()}>{busy ? "Working..." : "Regenerate answer"}</button>
      </section>
    </div>
  );
}
