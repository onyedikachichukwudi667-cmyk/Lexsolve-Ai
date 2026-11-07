"use client";
import type { StageKey, StreamEvent } from "@/lib/types";

const STAGES: { key: StageKey; label: string }[] = [
  { key: "analysing", label: "Analysing problem question" },
  { key: "issues", label: "Identifying legal issues" },
  { key: "searching", label: "Searching legal databases" },
  { key: "cases", label: "Retrieving relevant cases" },
  { key: "statutes", label: "Retrieving statutory provisions" },
  { key: "principles", label: "Examining legal principles" },
  { key: "applying", label: "Applying authorities" },
  { key: "constructing", label: "Constructing answer" },
];

type StageEvent = Extract<StreamEvent, { type: "stage" }>;

// Shows only what the server actually reported. Skipped stages are labelled as skipped.
export function ResearchPanel({ events, running }: { events: StageEvent[]; running: boolean }) {
  const latest = new Map<StageKey, StageEvent>();
  events.forEach((e) => latest.set(e.key, e));
  return (
    <div className="card">
      <p className="mb-2 font-heading text-lg font-semibold text-navy">Legal research</p>
      <ul className="space-y-2">
        {STAGES.map((s) => {
          const e = latest.get(s.key);
          const icon = !e ? "o" : e.status === "running" ? "..." : e.status === "done" ? "done" : e.status === "skipped" ? "skipped" : "error";
          const tone = !e ? "text-muted" : e.status === "skipped" ? "text-amber-800" : e.status === "error" ? "text-red-700" : "text-navy";
          return (
            <li key={s.key} className={`flex items-start justify-between gap-3 text-sm ${tone}`}>
              <span>
                {s.label}
                {e?.detail && <span className="block text-xs text-muted">{e.detail}</span>}
              </span>
              <span className="shrink-0 text-xs font-semibold uppercase">{running && e?.status === "running" ? "working" : icon}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
