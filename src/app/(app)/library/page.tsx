"use client";
import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { extractFile } from "@/lib/client/extract";
import { addToLibrary, clearLibraryCache } from "@/lib/client/library";

const KINDS = ["Judgment", "Statute", "Lecture notes", "Course material", "Case summary", "Ratio notes"];
interface Item { id: string; name: string; kind: string; chunks: number }

export default function Library() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [kind, setKind] = useState(KINDS[2]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const s = await getDocs(collection(db, "users", user.uid, "library")).catch(() => null);
    if (s) setItems(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) })));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function upload(f?: File) {
    if (!f || !user) return;
    setBusy(true);
    setMsg("Reading file...");
    try {
      const pages = await extractFile(f);
      await addToLibrary(user.uid, await token(), { name: f.name, kind }, pages, (d, t) => setMsg(`Indexing passages ${d}/${t}...`));
      setMsg(`Added ${f.name}.`);
      load();
    } catch (e: any) {
      setMsg(e.message || "Upload failed.");
    }
    setBusy(false);
  }

  async function remove(it: Item) {
    if (!user || !confirm(`Remove ${it.name} from your library?`)) return;
    const s = await getDocs(query(collection(db, "users", user.uid, "chunks"), where("docId", "==", it.id)));
    for (let i = 0; i < s.docs.length; i += 400) {
      const b = writeBatch(db);
      s.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
    await deleteDoc(doc(db, "users", user.uid, "library", it.id));
    clearLibraryCache();
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-navy">Legal Library</h1>
      <p className="text-sm text-muted">Upload PDF, DOCX or TXT. Text is extracted in your browser, split into passages, embedded and stored privately in your account. Your files are never shared. Only upload material you are allowed to keep.</p>
      <div className="card space-y-3">
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input type="file" accept=".pdf,.docx,.txt" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted">Your library is empty.</p>}
        {items.map((it) => (
          <div key={it.id} className="card flex items-center justify-between gap-3 text-sm">
            <div><p className="font-semibold text-navy">{it.name}</p><p className="text-muted">{it.kind} | {it.chunks} passages | personal material</p></div>
            <button className="text-red-700 underline" onClick={() => remove(it)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
