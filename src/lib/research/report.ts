import type { Analysis, Authority, QueryLog, ResearchReport } from "../types";

export function buildReport(a: {
  analysis: Analysis;
  authorities: Authority[];
  used: string[];
  queries: QueryLog[];
  databases: string[];
  limitations: string[];
}): ResearchReport {
  const selected = a.authorities.filter((x) => a.used.includes(x.label)).map((x) => x.label);
  return {
    generatedAt: new Date().toISOString(),
    issues: a.analysis.issues.map((i) => i.question),
    databasesSearched: a.databases,
    queries: a.queries,
    discovered: a.authorities.map((x) => ({ label: x.label, name: x.name, status: x.status })),
    selected,
    excluded: a.authorities
      .filter((x) => !a.used.includes(x.label))
      .map((x) => ({ name: x.name, reason: "Retrieved but not relied on in the final answer." })),
    limitations: a.limitations,
  };
}
