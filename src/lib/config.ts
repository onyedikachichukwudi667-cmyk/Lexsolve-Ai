// Research depth drives REAL behaviour: number of issues researched, queries per issue,
// results per query, search rounds, full-text fetches and ratio extractions.
// searchCallBudget caps outbound source calls. Cloudflare's free plan allows 50 subrequests
// per request, and the model/auth/settings calls also count, so keep deep at or below 30.
export const DEPTH = {
  quick: {
    label: "Quick Research",
    issues: 3,
    queriesPerIssue: 1,
    resultsPerQuery: 5,
    maxAuthorities: 4,
    iterations: 1,
    fullTextFetch: 0,
    ratioExtract: 0,
    searchCallBudget: 6,
  },
  standard: {
    label: "Standard Research",
    issues: 5,
    queriesPerIssue: 3,
    resultsPerQuery: 8,
    maxAuthorities: 7,
    iterations: 2,
    fullTextFetch: 3,
    ratioExtract: 3,
    searchCallBudget: 18,
  },
  deep: {
    label: "Deep Research",
    issues: 8,
    queriesPerIssue: 5,
    resultsPerQuery: 10,
    maxAuthorities: 12,
    iterations: 3,
    fullTextFetch: 6,
    ratioExtract: 6,
    searchCallBudget: 30,
  },
} as const;

export type Depth = keyof typeof DEPTH;

export const SUBJECTS = [
  "Law of Contract",
  "Law of Torts",
  "Criminal Law",
  "Constitutional Law",
  "Land Law",
  "Equity and Trusts",
  "Company Law",
  "Evidence",
  "Civil Procedure",
  "Criminal Procedure",
  "Administrative Law",
  "Customary Law",
  "Islamic Law",
  "Intellectual Property",
  "Family Law",
  "Labour Law",
  "Commercial Law",
  "Other",
];

export const JURISDICTIONS = ["Nigeria", "England and Wales (persuasive)", "Other"];

export const DEFAULT_SETTINGS = {
  rateLimitPerMinute: 6,
  maxQuestionChars: 12000,
  disabledSources: [] as string[],
};
export type AppSettings = typeof DEFAULT_SETTINGS & { model?: string };
