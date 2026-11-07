import type { LegalSource } from "./types";
import { openLegal } from "./openlegal";

// Register additional legal databases here.
export const ALL_SOURCES: LegalSource[] = [openLegal];

export function getSources(disabled: string[] = []): LegalSource[] {
  return ALL_SOURCES.filter((s) => s.isConfigured() && !disabled.includes(s.id));
}
