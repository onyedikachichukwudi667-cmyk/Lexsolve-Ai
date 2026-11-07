import { chatJson } from "../server/llm";
import { DEPTH, type Depth } from "../config";
import type { Analysis } from "../types";

const SYSTEM = `You are a legal issue spotter for Nigerian law students.
Read the problem question and return JSON only, in exactly this shape:
{
  "subject": string,
  "parties": [{"name": string, "role": string}],
  "facts": [string],
  "claimsAndDefences": [string],
  "issues": [{
    "id": "i1",
    "question": string,
    "subIssues": [string],
    "keywords": [string],
    "queries": [string],
    "statuteHints": [string]
  }]
}
Rules:
- "question" is a precise legal question, not a topic label.
- "queries" are short search phrases for a legal database: the exact issue, the doctrine, legal terminology, and a facts-based phrase.
- "statuteHints" are names of Nigerian statutes or constitutional provisions that may be relevant. They are search hints only and are never treated as verified.
- Do not invent case names or citations anywhere in this output.
- Use only facts stated in the question.`;

export async function analyzeQuestion(args: {
  question: string;
  subject: string;
  jurisdiction: string;
  depth: Depth;
  instructions?: string;
  model?: string;
}): Promise<Analysis> {
  const cfg = DEPTH[args.depth];
  const out = await chatJson<Analysis>({
    model: args.model,
    system: SYSTEM,
    maxTokens: 4000,
    user: `Subject selected by student: ${args.subject}
Jurisdiction: ${args.jurisdiction}
Return at most ${cfg.issues} issues and at most ${cfg.queriesPerIssue + 2} queries per issue.
Student instructions: ${args.instructions || "none"}

PROBLEM QUESTION:
${args.question}`,
  });

  const issues = (out.issues || []).slice(0, cfg.issues).map((i, n) => ({
    id: i.id || `i${n + 1}`,
    question: String(i.question || "").trim(),
    subIssues: Array.isArray(i.subIssues) ? i.subIssues : [],
    keywords: Array.isArray(i.keywords) ? i.keywords : [],
    queries: Array.isArray(i.queries) ? i.queries.filter(Boolean) : [],
    statuteHints: Array.isArray(i.statuteHints) ? i.statuteHints : [],
  }));
  return {
    subject: out.subject || args.subject,
    parties: Array.isArray(out.parties) ? out.parties : [],
    facts: Array.isArray(out.facts) ? out.facts : [],
    claimsAndDefences: Array.isArray(out.claimsAndDefences) ? out.claimsAndDefences : [],
    issues: issues.filter((i) => i.question),
  };
}
