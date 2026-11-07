import { DEFAULT_SETTINGS, type AppSettings } from "../config";
import { readDoc } from "./auth";

export async function loadSettings(token: string): Promise<AppSettings> {
  try {
    const doc = await readDoc(token, "settings/global");
    if (!doc) return { ...DEFAULT_SETTINGS };
    return {
      rateLimitPerMinute: Number(doc.rateLimitPerMinute) || DEFAULT_SETTINGS.rateLimitPerMinute,
      maxQuestionChars: Number(doc.maxQuestionChars) || DEFAULT_SETTINGS.maxQuestionChars,
      disabledSources: Array.isArray(doc.disabledSources) ? doc.disabledSources : [],
      model: typeof doc.model === "string" && doc.model ? doc.model : undefined,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
