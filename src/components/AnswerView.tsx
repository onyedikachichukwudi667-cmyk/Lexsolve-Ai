"use client";
import { useState } from "react";
import type { Authority, AnswerRecord } from "@/lib/types";
import { AuthorityCard } from "./AuthorityCard";
import { StatusBadge } from "./StatusBadge";

function Inline({ text, byLabel, onOpen }: { text: string; byLabel: Map<string, Authority>; onOpen: (l: string) => void }) {
  return (
    <>
      {text.split(/(\[[AUL]\d+\])/g).map((part, i) => {
        const m = part.match(/^\[([AUL]\d+)\]$/);
        if (!m) return <span key={i}>{part}</span>;
        const label = m[1];
        const a = byLabel.get(label);
        return (
          <button
            key={i}
            onClick={() => onOpen(label)}
            className="mx-0.5 rounded bg-gold-soft px-1 text-xs font-semibold text-navy underline"
            title={a ? `${a.name} (${a.status})` : "Your library passage"}
          >
            {a ? a.name.split(" v ")[0].slice(0, 28) : label}
          </button>
        );
      })}
    </>
  );
}

export function AnswerView({ record, onSearchMore, onVerify, busy }: {
  record: AnswerRecord;
  onSearchMore?: () => void;
  onVerify?: () => void;
  busy?: boolean;
}) {
  const r = record.result;
  const [panel, setPanel] = useState<"none" | "report" | "used">("none");
  const [open, setOpen] = useState<string | null>(null);
  const byLabel = new Map(r.authorities.map((a) => [a.label, a]));
  const used = r.authorities.filter((a) => r.usedLabels.includes(a.label));
  const ruleWord = record.method === "IPAC" ? "Principles" : "Rules";
  const openAuth = open ? byLabel.get(open) : undefined;
  const libOpen = open ? r.libraryPassages.find((l) => l.label === open) : undefined;

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="label">{record.method} answer | {record.subject} | v{record.version}</p>
        <p className="whitespace-pre-wrap text-sm text-muted">{record.question}</p>
      </div>

      {r.report.limitations.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-gold-soft p-3 text-sm text-amber-900">
          <p className="font-semibold">Research limitations</p>
          <ul className="ml-4 list-disc">{r.report.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}

      {r.answer.issues.map((iss, n) => (
        <section key={n} className="card space-y-3">
          <h3 className="font-heading text-lg font-semibold text-navy">Issue {n + 1}</h3>
          <p className="font-medium">{iss.question}</p>
          <div>
            <p className="label">{ruleWord}</p>
            {iss.rules.map((ru, i) => (
              <p key={i} className="mb-2 leading-relaxed"><Inline text={ru.text} byLabel={byLabel} onOpen={setOpen} /></p>
            ))}
          </div>
          <div>
            <p className="label">Application</p>
            <p className="whitespace-pre-wrap leading-relaxed"><Inline text={iss.application} byLabel={byLabel} onOpen={setOpen} /></p>
          </div>
          <div>
            <p className="label">Conclusion</p>
            <p className="leading-relaxed"><Inline text={iss.conclusion} byLabel={byLabel} onOpen={setOpen} /></p>
          </div>
        </section>
      ))}

      <section className="card">
        <p className="label">Overall conclusion</p>
        <p className="leading-relaxed"><Inline text={r.answer.overallConclusion} byLabel={byLabel} onOpen={setOpen} /></p>
        {r.answer.caveats.length > 0 && (
          <ul className="ml-4 mt-2 list-disc text-sm text-muted">{r.answer.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul>
        )}
      </section>

      <section className="card">
        <h3 className="font-heading text-lg font-semibold text-navy">Authorities</h3>
        {used.length === 0 && <p className="text-sm text-muted">No retrieved or supplied authority was relied on in this answer.</p>}
        <div className="mt-2 space-y-2">
          {used.map((a) => <AuthorityCard key={a.id} a={a} />)}
        </div>
        {r.answer.unverifiedLeads.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <p className="font-semibold text-red-800">Unverified leads (check before using)</p>
            <ul className="ml-4 list-disc">{r.answer.unverifiedLeads.map((l, i) => <li key={i}>{l.name}: {l.why} <StatusBadge status="unverified" /></li>)}</ul>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-ghost" onClick={() => setPanel(panel === "report" ? "none" : "report")}>View Research Report</button>
        <button className="btn btn-ghost" onClick={() => setPanel(panel === "used" ? "none" : "used")}>View Authorities Used</button>
        <button className="btn btn-ghost" disabled={busy || !onSearchMore} onClick={onSearchMore}>Search More Authorities</button>
        <button className="btn btn-ghost" disabled={busy || !onVerify} onClick={onVerify}>Verify Citations</button>
      </div>

      {panel === "report" && (
        <div className="card space-y-2 text-sm">
          <p className="font-heading text-lg font-semibold text-navy">Research report</p>
          <p><b>Issues:</b></p>
          <ul className="ml-4 list-disc">{r.report.issues.map((q, i) => <li key={i}>{q}</li>)}</ul>
          <p><b>Databases searched:</b> {r.report.databasesSearched.join(", ") || "None (no database connected)"}</p>
          <p><b>Queries:</b> {r.report.queries.length === 0 ? "None run" : ""}</p>
          <ul className="ml-4 list-disc">{r.report.queries.map((q, i) => <li key={i}>{q.query} ({q.kind}, {q.source}): {q.error ? "failed" : `${q.results} result(s)`}</li>)}</ul>
          <p><b>Discovered:</b> {r.report.discovered.length === 0 ? "None" : ""}</p>
          <ul className="ml-4 list-disc">{r.report.discovered.map((d, i) => <li key={i}>[{d.label}] {d.name} <StatusBadge status={d.status} /></li>)}</ul>
          {r.report.excluded.length > 0 && (
            <>
              <p><b>Excluded:</b></p>
              <ul className="ml-4 list-disc">{r.report.excluded.map((e, i) => <li key={i}>{e.name}: {e.reason}</li>)}</ul>
            </>
          )}
        </div>
      )}
      {panel === "used" && (
        <div className="space-y-2">{used.length ? used.map((a) => <AuthorityCard key={a.id} a={a} defaultOpen />) : <p className="text-sm text-muted">None.</p>}</div>
      )}

      {(openAuth || libOpen) && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-line bg-white p-4 shadow-2xl">
          <button className="btn btn-ghost mb-3" onClick={() => setOpen(null)}>Close</button>
          {openAuth && <AuthorityCard a={openAuth} defaultOpen />}
          {libOpen && (
            <div className="card text-sm">
              <p className="label">Your library: {libOpen.docName}{libOpen.page ? `, page ${libOpen.page}` : ""} (personal notes, not official authority)</p>
              <p>{libOpen.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
