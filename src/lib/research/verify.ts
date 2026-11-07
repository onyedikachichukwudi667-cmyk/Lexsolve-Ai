import type { Authority, ManualAuthority } from "../types";
import type { LegalSource } from "./sources/types";

// Converts student-supplied authorities into Authority records. They are NEVER replaced.
export function fromManual(list: ManualAuthority[]): Authority[] {
  return list.map((m, i) => ({
    id: `usr-${m.id}`,
    label: `U${i + 1}`,
    kind: m.kind,
    name: m.name,
    citation: m.citation,
    court: m.court,
    year: m.year,
    section: m.section,
    principle: m.holding || m.ratio,
    summary: m.notes,
    passages: [m.facts && `Facts: ${m.facts}`, m.issues && `Issues: ${m.issues}`, m.holding && `Holding: ${m.holding}`, m.ratio && `Ratio: ${m.ratio}`].filter(
      Boolean
    ) as string[],
    sourceName: "Supplied by student",
    origin: "user",
    status: "user_provided",
    statusNote: "Entered manually. Not independently confirmed.",
    fullTextAvailable: false,
  }));
}

// Tries to match a citation against configured sources. Never upgrades a status without a real match.
export async function verifyAuthorities(list: Authority[], sources: LegalSource[]): Promise<Authority[]> {
  const lookups = sources.filter((s) => s.lookupCitation);
  if (!lookups.length) return list;
  const out: Authority[] = [];
  for (const a of list) {
    if (!a.citation || a.status === "verified") {
      out.push(a);
      continue;
    }
    let matched: Authority | null = null;
    for (const s of lookups) {
      try {
        const hit = await s.lookupCitation!(a.citation);
        if (hit) {
          const sameName = hit.name.toLowerCase().replace(/[^a-z]/g, "").includes(a.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 8));
          matched = {
            ...a,
            status: sameName ? "verified" : "conflicting",
            statusNote: sameName
              ? `Citation matched in ${s.name}.`
              : `Citation found in ${s.name} but under a different case name ("${hit.name}"). Check carefully.`,
            sourceUrl: hit.url || a.sourceUrl,
          };
          break;
        }
      } catch {
        /* try next source */
      }
    }
    out.push(matched || { ...a, statusNote: (a.statusNote || "") + " Citation was not found in connected databases." });
  }
  return out;
}
