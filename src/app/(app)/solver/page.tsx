"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEPTH, JURISDICTIONS, SUBJECTS, type Depth } from "@/lib/config";
import type { AnswerRecord, AttachedDoc, ManualAuthority, Method, StreamEvent } from "@/lib/types";
import { runSolve, saveAnswer } from "@/lib/client/solve";
import { topPassages } from "@/lib/client/library";
import { extractFile } from "@/lib/client/extract";
import { ResearchPanel } from "@/components/ResearchPanel";
import { AnswerView } from "@/components/AnswerView";

const MAX = 12000;
type StageEvent = Extract<StreamEvent, { type: "stage" }>;

function Solver() {
  const { user, token } = useAuth();
  const params = useSearchParams();
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [jurisdiction, setJurisdiction] = useState(JURISDICTIONS[0]);
  const [method, setMethod] = useState<Method>("IRAC");
  const [depth, setDepth] = useState<Depth>("standard");
  const [instructions, setInstructions] = useState("");
  const [mine, setMine] = useState<ManualAuthority[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [docs, setDocs] = useState<AttachedDoc[]>([]);
  const [useLibrary, setUseLibrary] = useState(true);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<AnswerRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "authorities")).then((s) => setMine(s.docs.map((d) => ({ ...(d.data() as ManualAuthority), id: d.id })))).catch(() => {});
    const saved = params.get("saved");
    if (saved) getDoc(doc(db, "users", user.uid, "saved", saved)).then((d) => d.exists() && setQuestion(String(d.data().question || ""))).catch(() => {});
  }, [user, params]);

  async function addFile(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      const pages = await extractFile(f);
      setDocs((d) => [...d, { name: f.name, text: pages.map((p) => p.text).join("\n\n").slice(0, 20000) }].slice(0, 3));
    } catch (e: any) {
      setError(e.message || "Could not read that file.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (question.trim().length < 20) return setError("Enter the full problem question (at least 20 characters).");
    setError("");
    setEvents([]);
    setRecord(null);
    setRunning(true);
    try {
      const t = await token();
      const libraryPassages = useLibrary ? await topPassages(user.uid, t, question).catch(() => []) : [];
      const result = await runSolve(
        t,
        { question: question.trim(), subject, jurisdiction, method, depth, instructions: instructions.trim() || undefined, userAuthorities: mine.filter((m) => picked.includes(m.id)), libraryPassages, attachedDocs: docs },
        (ev) => ev.type === "stage" && setEvents((p) => [...p, ev])
      );
      const rec = { version: 1, question: question.trim(), subject, jurisdiction, method, depth, instructions: instructions.trim() || undefined, result };
      const id = await saveAnswer(user.uid, rec);
      setRecord({ ...rec, id });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    }
    setRunning(false);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-semibold text-navy">AI Problem Solver</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="q">Problem question</label>
          <textarea id="q" className="field min-h-[200px]" maxLength={MAX} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Paste the full problem question here..." />
          <p className="mt-1 text-right text-xs text-muted">{question.length}/{MAX}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Legal subject</label><select className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Jurisdiction</label><select className="field" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>{JURISDICTIONS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Method</label><select className="field" value={method} onChange={(e) => setMethod(e.target.value as Method)}><option value="IRAC">IRAC</option><option value="IPAC">IPAC</option></select></div>
          <div><label className="label">Research depth</label><select className="field" value={depth} onChange={(e) => setDepth(e.target.value as Depth)}>{(Object.keys(DEPTH) as Depth[]).map((d) => <option key={d} value={d}>{DEPTH[d].label}</option>)}</select></div>
        </div>
        <div><label className="label">Additional instructions (optional)</label><textarea className="field min-h-[70px]" maxLength={2000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="For example: keep it under 800 words, focus on remedies." /></div>

        <div>
          <label className="label">Attach my saved authorities</label>
          {mine.length === 0 ? <p className="text-sm text-muted">None saved yet. Add some under My Authorities.</p> : (
            <div className="space-y-1">{mine.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(m.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />{m.name} {m.citation}</label>
            ))}</div>
          )}
        </div>
        <div>
          <label className="label">Upload a document for this question (PDF, DOCX, TXT, up to 3)</label>
          <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => { addFile(e.target.files?.[0]); e.target.value = ""; }} />
          {docs.map((d, i) => <p key={i} className="mt-1 text-sm text-muted">{d.name} <button type="button" className="text-red-700 underline" onClick={() => setDocs(docs.filter((_, n) => n !== i))}>remove</button></p>)}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useLibrary} onChange={(e) => setUseLibrary(e.target.checked)} /> Use my personal library</label>

        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn btn-gold w-full" disabled={running}>{running ? "Researching..." : "Generate Answer"}</button>
      </form>

      {(running || events.length > 0) && <ResearchPanel events={events} running={running} />}
      {record && <AnswerView record={record} />}
    </div>
  );
}

export default function SolverPage() {
  return <Suspense fallback={null}><Solver /></Suspense>;
}
