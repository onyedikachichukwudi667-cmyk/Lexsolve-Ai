import type { Depth } from "./config";

export type VerificationStatus =
  | "verified"
  | "retrieved"
  | "user_provided"
  | "unverified"
  | "conflicting";

export type Method = "IPAC" | "IRAC";

export interface RatioInfo {
  facts: string;
  issues: string;
  holding: string;
  ratio: string;
  obiter: string;
  relevance: string;
  aiGenerated: true;
  confirmed: false;
}

export interface Authority {
  id: string;
  label: string; // A1, U1 ... used for inline citation markers
  kind: "case" | "statute";
  name: string;
  citation?: string;
  court?: string;
  year?: number;
  section?: string;
  principle?: string;
  summary?: string;
  passages: string[];
  sourceName: string;
  sourceUrl?: string;
  origin: "external" | "user";
  status: VerificationStatus;
  statusNote?: string;
  fullTextAvailable: boolean;
  ratio?: RatioInfo;
  text?: string; // server-side only, stripped before sending to the client
}

export interface ManualAuthority {
  id: string;
  kind: "case" | "statute";
  name: string;
  citation?: string;
  court?: string;
  year?: number;
  section?: string;
  facts?: string;
  issues?: string;
  holding?: string;
  ratio?: string;
  notes?: string;
}

export interface LibraryPassage {
  label: string; // L1, L2 ...
  docName: string;
  page?: number;
  text: string;
  kind?: string;
}

export interface AttachedDoc {
  name: string;
  text: string;
}

export interface LegalIssue {
  id: string;
  question: string;
  subIssues: string[];
  keywords: string[];
  queries: string[];
  statuteHints: string[];
}

export interface Analysis {
  subject: string;
  parties: { name: string; role: string }[];
  facts: string[];
  claimsAndDefences: string[];
  issues: LegalIssue[];
}

export interface QueryLog {
  query: string;
  source: string;
  kind: "case" | "statute";
  issueId: string;
  results: number;
  error?: boolean;
}

export interface AnswerIssue {
  question: string;
  rules: { text: string; cites: string[] }[];
  application: string;
  conclusion: string;
}

export interface AnswerBody {
  issues: AnswerIssue[];
  overallConclusion: string;
  unverifiedLeads: { name: string; why: string }[];
  caveats: string[];
}

export interface ResearchReport {
  generatedAt: string;
  issues: string[];
  databasesSearched: string[];
  queries: QueryLog[];
  discovered: { label: string; name: string; status: VerificationStatus }[];
  selected: string[];
  excluded: { name: string; reason: string }[];
  limitations: string[];
}

export interface SolveResult {
  analysis: Analysis;
  answer: AnswerBody;
  authorities: Authority[];
  usedLabels: string[];
  report: ResearchReport;
  libraryPassages: LibraryPassage[];
}

export interface SolveRequest {
  question: string;
  subject: string;
  jurisdiction: string;
  method: Method;
  depth: Depth;
  instructions?: string;
  userAuthorities: ManualAuthority[];
  libraryPassages: Omit<LibraryPassage, "label">[];
  attachedDocs: AttachedDoc[];
}

export type StageKey =
  | "analysing"
  | "issues"
  | "searching"
  | "cases"
  | "statutes"
  | "principles"
  | "applying"
  | "constructing";

export type StreamEvent =
  | { type: "stage"; key: StageKey; status: "running" | "done" | "skipped" | "error"; detail?: string }
  | { type: "result"; data: SolveResult }
  | { type: "error"; message: string };

export interface AnswerRecord {
  id?: string;
  parentId?: string;
  version: number;
  question: string;
  subject: string;
  jurisdiction: string;
  method: Method;
  depth: Depth;
  instructions?: string;
  result: SolveResult;
  createdAt?: { seconds: number } | null;
}
