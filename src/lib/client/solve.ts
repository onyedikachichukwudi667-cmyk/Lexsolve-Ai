import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { AnswerRecord, SolveRequest, SolveResult, StreamEvent } from "../types";

export async function runSolve(token: string, body: SolveRequest, onEvent: (e: StreamEvent) => void): Promise<SolveResult> {
  const res = await fetch("/api/solve", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const msg = (await res.json().catch(() => null))?.error || "The request failed.";
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: SolveResult | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const e = JSON.parse(line) as StreamEvent;
      if (e.type === "error") throw new Error(e.message);
      if (e.type === "result") result = e.data;
      onEvent(e);
    }
  }
  if (!result) throw new Error("The connection closed before an answer was produced.");
  return result;
}

export async function saveAnswer(uid: string, rec: Omit<AnswerRecord, "id" | "createdAt">): Promise<string> {
  const clean = JSON.parse(JSON.stringify(rec)); // drops undefined, which Firestore rejects
  const ref = await addDoc(collection(db, "users", uid, "answers"), { ...clean, createdAt: serverTimestamp() });
  return ref.id;
}
