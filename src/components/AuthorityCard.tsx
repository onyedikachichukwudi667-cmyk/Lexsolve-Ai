"use client";
import { useState } from "react";
import type { Authority } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function AuthorityCard({ a, defaultOpen = false }: { a: Authority; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" id={`auth-${a.label}`}>
      <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <p className="font-heading text-base font-semibold text-navy">
            <span className="mr-2 rounded bg-navy px-1.5 py-0.5 text-xs text-white">{a.label}</span>
            {a.name}
          </p>
          <p className="mt-1 text-sm text-muted">
            {[a.citation, a.court, a.year, a.section && `s. ${a.section}`].filter(Boolean).join(" | ") || "No citation details"}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm">
          {a.statusNote && <p className="text-muted">{a.statusNote}</p>}
          {a.principle && (
            <div>
              <p className="label">Principle</p>
              <p>{a.principle}</p>
            </div>
          )}
          {a.ratio && (
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="label">Case summary (AI generated, not independently confirmed)</p>
              <p><b>Facts:</b> {a.ratio.facts}</p>
              <p className="mt-1"><b>Issues:</b> {a.ratio.issues}</p>
              <p className="mt-1"><b>Holding:</b> {a.ratio.holding}</p>
              <p className="mt-1"><b>Ratio:</b> {a.ratio.ratio}</p>
              <p className="mt-1"><b>Obiter:</b> {a.ratio.obiter}</p>
              <p className="mt-1"><b>Relevance:</b> {a.ratio.relevance}</p>
            </div>
          )}
          {a.passages.length > 0 && (
            <div>
              <p className="label">Relevant passages</p>
              {a.passages.map((p, i) => (
                <p key={i} className="mb-2 border-l-2 border-gold pl-3 text-ink">{p}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted">
            Source: {a.sourceName}
            {a.sourceUrl && (
              <>
                {" "}
                <a className="text-navy underline" href={a.sourceUrl} target="_blank" rel="noopener noreferrer">open source</a>
              </>
            )}
            {!a.fullTextAvailable && a.origin === "external" && " | Limited information only, not a full judgment"}
          </p>
        </div>
      )}
    </div>
  );
}
