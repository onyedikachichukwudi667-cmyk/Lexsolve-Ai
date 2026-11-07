"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface Hit { name: string; citation?: string; court?: string; year?: number; section?: string; snippet?: string; url?: string; sourceName?: string }

export default function ResearchPage() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"case" | "statute">("case");
  const [hits, setHits] = useState<Hit[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    setHits([]);
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ query: q, kind }) });
      const j = await res.json();
      if (!res.ok) setNote(j.error || "Search failed.");
      else {
        setHits(j.results || []);
        setNote(j.message || (j.errors?.length ? j.errors.join(" ") : (j.results || []).length ? "" : "No results. Try different terminology or a related doctrine."));
      }
    } catch {
      setNote("Could not reach the search service.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-navy">Legal Research</h1>
      <form onSubmit={search} className="space-y-3">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. consideration past promise" minLength={3} required />
        <div className="flex gap-2">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as "case" | "statute")}><option value="case">Cases</option><option value="statute">Statutes</option></select>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Searching..." : "Search"}</button>
        </div>
      </form>
      {note && <p className="rounded-lg border border-line bg-gold-soft p-3 text-sm">{note}</p>}
      <div className="space-y-2">
        {hits.map((h, i) => (
          <div key={i} className="card text-sm">
            <p className="font-heading font-semibold text-navy">{h.name}</p>
            <p className="text-muted">{[h.citation, h.court, h.year, h.section && `s. ${h.section}`].filter(Boolean).join(" | ")}</p>
            {h.snippet && <p className="mt-1">{h.snippet}</p>}
            <p className="mt-1 text-xs text-muted">Search snippet only, not a full judgment. {h.sourceName} {h.url && <a className="underline" href={h.url} target="_blank" rel="noopener noreferrer">open</a>}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
