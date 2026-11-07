import { DEPTH } from "../config";
import type { AppSettings } from "../config";
import type { Authority, SolveRequest, SolveResult, StreamEvent } from "../types";
import { analyzeQuestion } from "./analyzer";
import { runResearch } from "./orchestrator";
import { fromManual, verifyAuthorities } from "./verify";
import { extractRatio } from "./ratio";
import { generateAnswer, usedLabels } from "./answer";
import { buildReport } from "./report";
import { getSources } from "./sources";

type Emit = (e: StreamEvent) => void;

export async function runPipeline(req: SolveRequest, settings: AppSettings, emit: Emit): Promise<SolveResult> {
  const cfg = DEPTH[req.depth];
  const model = settings.model;

  // A + B: analyse and identify issues
  emit({ type: "stage", key: "analysing", status: "running" });
  const analysis = await analyzeQuestion({
    question: req.question,
    subject: req.subject,
    jurisdiction: req.jurisdiction,
    depth: req.depth,
    instructions: req.instructions,
    model,
  });
  emit({ type: "stage", key: "analysing", status: "done" });
  emit({ type: "stage", key: "issues", status: "done", detail: `${analysis.issues.length} issue(s) identified` });

  // C: search + retrieval
  const sources = getSources(settings.disabledSources);
  const research = await runResearch({ analysis, depth: req.depth, sources, emit });

  // D: verification of student authorities (never replaced, only annotated)
  const userAuths = await verifyAuthorities(fromManual(req.userAuthorities), sources);
  let authorities: Authority[] = [...research.authorities, ...userAuths];

  // E: ratio extraction (only where real judgment text exists)
  if (cfg.ratioExtract > 0 && research.authorities.some((a) => a.text)) {
    emit({ type: "stage", key: "principles", status: "running", detail: "Extracting ratio from retrieved judgments" });
    const targets = authorities.filter((a) => a.kind === "case" && a.text).slice(0, cfg.ratioExtract);
    // Sequential on purpose: free AI tiers allow only a few requests per minute.
    for (const t of targets) {
      t.ratio = await extractRatio(t, analysis.issues[0]?.question || req.question, model);
    }
    emit({ type: "stage", key: "principles", status: "done", detail: `${targets.filter((t) => t.ratio).length} ratio extraction(s), AI generated` });
  } else {
    emit({ type: "stage", key: "principles", status: "skipped", detail: "No full judgment text available for ratio extraction" });
  }

  // F + G: application and answer
  emit({ type: "stage", key: "applying", status: "running" });
  emit({ type: "stage", key: "constructing", status: "running" });
  const library = req.libraryPassages.map((p, i) => ({ ...p, label: `L${i + 1}` }));
  const answer = await generateAnswer({
    question: req.question,
    method: req.method,
    analysis,
    authorities,
    library,
    docs: req.attachedDocs,
    instructions: req.instructions,
    model,
  });
  emit({ type: "stage", key: "applying", status: "done" });
  emit({ type: "stage", key: "constructing", status: "done" });

  const used = usedLabels(answer);
  const limitations = [...research.limitations];
  if (!authorities.length) limitations.push("The answer cites no authorities because none were retrieved or supplied.");
  if (answer.unverifiedLeads.length) limitations.push("Some possible authorities are listed as unverified leads. Confirm them before use.");

  // Strip heavy text before returning to the client
  authorities = authorities.map(({ text: _t, ...rest }) => rest as Authority);

  return {
    analysis,
    answer,
    authorities,
    usedLabels: used,
    report: buildReport({ analysis, authorities, used, queries: research.queries, databases: research.databases, limitations }),
    libraryPassages: library,
  };
}
