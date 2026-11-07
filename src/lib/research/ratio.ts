import { chatJson } from "../server/llm";
import type { Authority, RatioInfo } from "../types";

const SYSTEM = `You extract the ratio decidendi of a judgment for a law student.
Return JSON only:
{"facts": string, "issues": string, "holding": string, "ratio": string, "obiter": string, "relevance": string}
Rules:
- Use ONLY the judgment text supplied. If the text does not support a field, write "Not shown in the retrieved text."
- Do not treat every judicial remark as ratio. Ratio is the reasoning necessary for the decision on the issue named.
- Do not quote text that is not in the supplied passage. Do not invent citations.`;

export async function extractRatio(a: Authority, issueQuestion: string, model?: string): Promise<RatioInfo | undefined> {
  if (!a.text) return undefined;
  try {
    const r = await chatJson<Omit<RatioInfo, "aiGenerated" | "confirmed">>({
      model,
      system: SYSTEM,
      maxTokens: 1500,
      user: `Case: ${a.name} ${a.citation || ""}\nIssue of interest: ${issueQuestion}\n\nJUDGMENT TEXT (may be truncated):\n${a.text.slice(0, 24000)}`,
    });
    return { ...r, aiGenerated: true, confirmed: false };
  } catch {
    return undefined;
  }
}
