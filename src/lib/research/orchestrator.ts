import { DEPTH, type Depth } from "../config";
import type { Analysis, Authority, LegalIssue, QueryLog, StreamEvent } from "../types";
import type { LegalSource, RawHit } from "./sources/types";

type Emit = (e: StreamEvent) => void;

export interface ResearchOutcome {
  authorities: Authority[];
  queries: QueryLog[];
  limitations: string[];
  databases: string[];
}

function key(h: RawHit) {
  return `${h.kind}|${h.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${(h.citation || "").toLowerCase().replace(/\s/g, "")}`;
}

function courtWeight(h: RawHit): number {
  if (h.kind === "statute") return 0.9;
  const c = (h.court || "").toLowerCase();
  if (c.includes("supreme")) return 1;
  if (c.includes("appeal")) return 0.8;
  if (c.includes("high")) return 0.6;
  return 0.4;
}

export function extractPassages(text: string, keywords: string[], n = 3, max = 600): string[] {
  const words = keywords.flatMap((k) => k.toLowerCase().split(/\W+/)).filter((w) => w.length > 3);
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 80);
  return paras
    .map((p) => ({ p, s: words.reduce((a, w) => a + (p.toLowerCase().includes(w) ? 1 : 0), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => (x.p.length > max ? x.p.slice(0, max) + "..." : x.p));
}

function fallbackQueries(issue: LegalIssue, round: number): string[] {
  const kw = issue.keywords;
  if (round === 1) return [kw.slice(0, 3).join(" "), ...issue.statuteHints.slice(0, 2)].filter(Boolean);
  return [kw.slice(0, 2).join(" ") + " Nigeria", issue.question.slice(0, 120)].filter(Boolean);
}

export async function runResearch(a: {
  analysis: Analysis;
  depth: Depth;
  sources: LegalSource[];
  emit: Emit;
}): Promise<ResearchOutcome> {
  const cfg = DEPTH[a.depth];
  const queries: QueryLog[] = [];
  const limitations: string[] = [];
  const databases = a.sources.map((s) => s.name);

  if (!a.sources.length) {
    limitations.push(
      "No external legal database is connected, so no live search was performed. The answer rests on your supplied materials and general legal principles. Verify every authority yourself."
    );
    a.emit({ type: "stage", key: "searching", status: "skipped", detail: "No legal database connected" });
    a.emit({ type: "stage", key: "cases", status: "skipped" });
    a.emit({ type: "stage", key: "statutes", status: "skipped" });
    return { authorities: [], queries, limitations, databases };
  }

  a.emit({ type: "stage", key: "searching", status: "running", detail: `Searching ${databases.join(", ")}` });
  const pool = new Map<string, { hit: RawHit; src: LegalSource; issue: LegalIssue; hits: number }>();
  const issues = a.analysis.issues.slice(0, cfg.issues);
  let calls = 0;

  for (let round = 0; round < cfg.iterations; round++) {
    const tasks: { q: string; issue: LegalIssue; src: LegalSource; kind: "case" | "statute" }[] = [];
    for (const issue of issues) {
      const qs = round === 0 ? issue.queries.slice(0, cfg.queriesPerIssue) : fallbackQueries(issue, round);
      for (const q of qs)
        for (const src of a.sources)
          for (const kind of ["case", "statute"] as const) tasks.push({ q, issue, src, kind });
    }
    const allowed = tasks.slice(0, Math.max(0, cfg.searchCallBudget - calls));
    if (allowed.length < tasks.length) limitations.push("Search budget for this depth was reached. Try Deep Research for wider coverage.");
    for (let i = 0; i < allowed.length; i += 5) {
      await Promise.all(
        allowed.slice(i, i + 5).map(async (t) => {
          calls++;
          try {
            const hits = await t.src.search(t.q, { kind: t.kind, limit: cfg.resultsPerQuery });
            queries.push({ query: t.q, source: t.src.name, kind: t.kind, issueId: t.issue.id, results: hits.length });
            for (const h of hits) {
              const k = key(h);
              const prev = pool.get(k);
              if (prev) prev.hits++;
              else pool.set(k, { hit: h, src: t.src, issue: t.issue, hits: 1 });
            }
          } catch {
            queries.push({ query: t.q, source: t.src.name, kind: t.kind, issueId: t.issue.id, results: 0, error: true });
          }
        })
      );
    }
    if (pool.size >= cfg.maxAuthorities) break;
  }

  const failed = queries.filter((q) => q.error).length;
  if (failed) limitations.push(`${failed} search request(s) failed. Live research may be incomplete.`);
  if (!pool.size) limitations.push("No sufficiently reliable authority was found after the configured searches.");

  const ranked = [...pool.values()]
    .map((x) => ({ ...x, score: (x.hit.score ?? 0.5) * 0.5 + courtWeight(x.hit) * 0.3 + Math.min(x.hits, 4) * 0.05 }))
    .sort((p, q) => q.score - p.score)
    .slice(0, cfg.maxAuthorities);

  const authorities: Authority[] = [];
  let fetched = 0;
  for (const [i, r] of ranked.entries()) {
    let text: string | undefined;
    let url = r.hit.url;
    if (r.src.fetchFull && fetched < cfg.fullTextFetch) {
      try {
        fetched++;
        const full = await r.src.fetchFull(r.hit);
        if (full?.text) {
          text = full.text.slice(0, 40000);
          url = full.url || url;
        }
      } catch {
        /* leave as snippet-only */
      }
    }
    const kw = [...r.issue.keywords, r.issue.question];
    const passages = text ? extractPassages(text, kw) : r.hit.snippet ? [r.hit.snippet] : [];
    authorities.push({
      id: `ext-${i}`,
      label: `A${i + 1}`,
      kind: r.hit.kind,
      name: r.hit.name,
      citation: r.hit.citation,
      court: r.hit.court,
      year: r.hit.year,
      section: r.hit.section,
      passages,
      sourceName: r.src.name,
      sourceUrl: url,
      origin: "external",
      status: text ? "verified" : "retrieved",
      statusNote: text
        ? `Full text retrieved from ${r.src.name}.`
        : "Located in the source but only limited information was retrieved. Not a full judgment.",
      fullTextAvailable: Boolean(text),
      text,
    });
  }
  const nCases = authorities.filter((x) => x.kind === "case").length;
  a.emit({ type: "stage", key: "searching", status: "done", detail: `${queries.length} queries run` });
  a.emit({ type: "stage", key: "cases", status: "done", detail: `${nCases} case(s) retrieved` });
  a.emit({ type: "stage", key: "statutes", status: "done", detail: `${authorities.length - nCases} statutory item(s) retrieved` });
  return { authorities, queries, limitations, databases };
}
