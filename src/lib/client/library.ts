import { addDoc, collection, getDocs, limit, query, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { LibraryPassage } from "../types";

export interface PageText {
  page?: number;
  text: string;
}

// Paragraph-aware chunking, roughly 1200 characters with overlap, page numbers preserved.
export function chunkPages(pages: PageText[], size = 1200, overlap = 150): PageText[] {
  const out: PageText[] = [];
  for (const p of pages) {
    const paras = p.text.split(/\n{2,}|(?<=[.!?])\s{2,}/).map((s) => s.trim()).filter(Boolean);
    let cur = "";
    for (const para of paras) {
      if ((cur + " " + para).length > size && cur) {
        out.push({ page: p.page, text: cur });
        cur = cur.slice(-overlap) + " " + para;
      } else cur = cur ? cur + " " + para : para;
    }
    if (cur.trim().length > 40) out.push({ page: p.page, text: cur });
  }
  return out;
}

export async function embedTexts(token: string, texts: string[]): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const res = await fetch("/api/embed", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ inputs: texts.slice(i, i + 16).map((t) => t.slice(0, 3800)) }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Embedding failed");
    all.push(...(j.vectors as number[][]));
  }
  return all;
}

export async function addToLibrary(
  uid: string,
  token: string,
  meta: { name: string; kind: string },
  pages: PageText[],
  onProgress?: (done: number, total: number) => void
) {
  clearLibraryCache();
  const chunks = chunkPages(pages);
  if (!chunks.length) throw new Error("No readable text was found in this file.");
  const docRef = await addDoc(collection(db, "users", uid, "library"), {
    ...meta,
    chunks: chunks.length,
    createdAt: Date.now(),
  });
  for (let i = 0; i < chunks.length; i += 16) {
    const slice = chunks.slice(i, i + 16);
    const vecs = await embedTexts(token, slice.map((c) => c.text));
    const batch = writeBatch(db);
    slice.forEach((c, n) => {
      const ref = doc(collection(db, "users", uid, "chunks"));
      batch.set(ref, {
        docId: docRef.id,
        docName: meta.name,
        kind: meta.kind,
        page: c.page ?? null,
        text: c.text,
        embedding: vecs[n],
      });
    });
    await batch.commit();
    onProgress?.(Math.min(i + 16, chunks.length), chunks.length);
  }
  return docRef.id;
}

// Reading chunks costs Firestore reads (free plan: 50,000 per day). Cache them per session
// so repeated questions do not re-read the whole library.
let cache: { uid: string; rows: any[] } | null = null;
export function clearLibraryCache() {
  cache = null;
}

function cosine(a: number[], b: number[]) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Vector retrieval done in the browser over the user's own chunks (free, private, fine at student scale).
export async function topPassages(
  uid: string,
  token: string,
  question: string,
  k = 6
): Promise<Omit<LibraryPassage, "label">[]> {
  if (!cache || cache.uid !== uid) {
    const snap = await getDocs(query(collection(db, "users", uid, "chunks"), limit(1500)));
    cache = { uid, rows: snap.docs.map((d) => d.data() as any) };
  }
  if (!cache.rows.length) return [];
  const [qv] = await embedTexts(token, [question.slice(0, 3800)]);
  return cache.rows
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length === qv.length)
    .map((c) => ({ score: cosine(qv, c.embedding), docName: c.docName, page: c.page ?? undefined, text: String(c.text).slice(0, 2400), kind: c.kind }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((x) => x.score > 0.3)
    .map(({ score: _s, ...rest }) => rest);
}
