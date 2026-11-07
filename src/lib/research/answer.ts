import { chatJson } from "../server/llm";
import type { AnswerBody, Analysis, Authority, AttachedDoc, LibraryPassage, Method } from "../types";

function buildContext(auths: Authority[], lib: LibraryPassage[], docs: AttachedDoc[]) {
  const a = auths
    .map(
      (x) =>
        `[${x.label}] ${x.kind.toUpperCase()}: ${x.name} ${x.citation || ""} ${x.court || ""} ${x.year || ""} ${x.section ? "s." + x.section : ""}
Origin: ${x.origin === "user" ? "supplied by student" : "retrieved from " + x.sourceName}. Status: ${x.status}.
${x.ratio ? `Ratio (AI extracted): ${x.ratio.ratio}\nHolding: ${x.ratio.holding}\n` : ""}${x.passages.map((p) => "Passage: " + p).join("\n")}`
    )
    .join("\n\n");
  const l = lib.map((p) => `[${p.label}] Student's personal material "${p.docName}"${p.page ? ` p.${p.page}` : ""}: ${p.text}`).join("\n\n");
  const d = docs.map((x) => `Uploaded document "${x.name}":\n${x.text.slice(0, 12000)}`).join("\n\n");
  return { a, l, d };
}

export async function generateAnswer(args: {
  question: string;
  method: Method;
  analysis: Analysis;
  authorities: Authority[];
  library: LibraryPassage[];
  docs: AttachedDoc[];
  instructions?: string;
  model?: string;
}): Promise<AnswerBody> {
  const ruleWord = args.method === "IPAC" ? "Principles" : "Rules";
  const ctx = buildContext(args.authorities, args.library, args.docs);
  const system = `You write ${args.method} answers to Nigerian law problem questions.
${args.method} = Issues, ${ruleWord}, Application, Conclusion. Follow it strictly.

HARD RULES ON AUTHORITIES:
- You may cite a case or statute ONLY if it appears in the AUTHORITIES block, and you must cite it by its label, for example [A1] or [U2].
- Never write a case name, citation, judge, date or quotation that is not in the AUTHORITIES block.
- A label may support a proposition only if its supplied passages or ratio reasonably support it. If not, do not cite it.
- If no supplied authority covers a point, state the general principle in plain words WITHOUT a case name, and if a well known authority or statute may exist, list it under "unverifiedLeads" so the student can check it. Never present it as verified.
- Library passages are labelled [L#] and are the student's own notes, not official authority. You may use them for reasoning and cite the label.
- Prefer retrieved and supplied sources over your own recollection.
- Application must analyse the specific facts: which facts satisfy each element, counter arguments, defences, and exceptions. Do not restate the rule.
- Be honest about uncertainty. Do not overstate certainty where facts or discretion decide the outcome.
Write in clear prose, no bullet fragments inside application. Do not use em dashes.

Return JSON only:
{
 "issues": [{"question": string, "rules": [{"text": string, "cites": [string]}], "application": string, "conclusion": string}],
 "overallConclusion": string,
 "unverifiedLeads": [{"name": string, "why": string}],
 "caveats": [string]
}
Use inline markers like [A1] inside "application" and "rules.text" where an authority supports the sentence.`;

  const user = `PROBLEM QUESTION:
${args.question}

ISSUES IDENTIFIED:
${args.analysis.issues.map((i, n) => `${n + 1}. ${i.question}`).join("\n")}

AUTHORITIES:
${ctx.a || "(none supplied or retrieved)"}

STUDENT LIBRARY PASSAGES:
${ctx.l || "(none)"}

UPLOADED DOCUMENTS:
${ctx.d || "(none)"}

ADDITIONAL INSTRUCTIONS: ${args.instructions || "none"}`;

  const raw = await chatJson<AnswerBody>({ model: args.model, system, user, maxTokens: 9000 });

  // Validation: strip any citation marker that does not map to a supplied authority or passage.
  const valid = new Set([...args.authorities.map((a) => a.label), ...args.library.map((l) => l.label)]);
  const clean = (t: string) => String(t || "").replace(/\[([AUL]\d+)\]/g, (m, id) => (valid.has(id) ? m : ""));
  return {
    issues: (raw.issues || []).map((i) => ({
      question: String(i.question || ""),
      rules: (i.rules || []).map((r) => ({
        text: clean(r.text),
        cites: (r.cites || []).filter((c) => valid.has(c)),
      })),
      application: clean(i.application),
      conclusion: clean(i.conclusion),
    })),
    overallConclusion: clean(raw.overallConclusion),
    unverifiedLeads: Array.isArray(raw.unverifiedLeads) ? raw.unverifiedLeads.slice(0, 8) : [],
    caveats: Array.isArray(raw.caveats) ? raw.caveats : [],
  };
}

export function usedLabels(body: AnswerBody): string[] {
  const set = new Set<string>();
  const scan = (t: string) => [...t.matchAll(/\[([AUL]\d+)\]/g)].forEach((m) => set.add(m[1]));
  for (const i of body.issues) {
    scan(i.application);
    scan(i.conclusion);
    for (const r of i.rules) {
      scan(r.text);
      r.cites.forEach((c) => set.add(c));
    }
  }
  scan(body.overallConclusion);
  return [...set];
}
