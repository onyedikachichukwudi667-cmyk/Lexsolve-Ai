import { z } from "zod";
import { verifyIdToken } from "@/lib/server/auth";
import { loadSettings } from "@/lib/server/settings";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSources } from "@/lib/research/sources";

const schema = z.object({ query: z.string().min(3).max(300), kind: z.enum(["case", "statute"]) });

// Direct keyword search against connected legal databases (Legal Research page).
export async function POST(req: Request) {
  const user = await verifyIdToken(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`search:${user.uid}`, 20)) return Response.json({ error: "Too many requests." }, { status: 429 });
  let input;
  try {
    input = schema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid search." }, { status: 400 });
  }
  const settings = await loadSettings(user.token);
  const sources = getSources(settings.disabledSources);
  if (!sources.length) {
    return Response.json({ connected: false, results: [], message: "No legal database is connected yet. Add authorities manually or connect a source (see README)." });
  }
  const results: unknown[] = [];
  const errors: string[] = [];
  for (const s of sources) {
    try {
      const hits = await s.search(input.query, { kind: input.kind, limit: 10 });
      results.push(...hits.map((h) => ({ ...h, sourceName: s.name })));
    } catch {
      errors.push(`${s.name} is currently unavailable.`);
    }
  }
  return Response.json({ connected: true, results, errors });
}
