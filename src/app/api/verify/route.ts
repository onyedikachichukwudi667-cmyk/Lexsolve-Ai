import { z } from "zod";
import { verifyIdToken } from "@/lib/server/auth";
import { loadSettings } from "@/lib/server/settings";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSources } from "@/lib/research/sources";
import { verifyAuthorities } from "@/lib/research/verify";
import type { Authority } from "@/lib/types";

const schema = z.object({ authorities: z.array(z.any()).max(30) });

// "Verify Citations" button: re-checks citations against connected databases.
export async function POST(req: Request) {
  const user = await verifyIdToken(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`verify:${user.uid}`, 10)) return Response.json({ error: "Too many requests." }, { status: 429 });
  try {
    const { authorities } = schema.parse(await req.json());
    const settings = await loadSettings(user.token);
    const sources = getSources(settings.disabledSources);
    if (!sources.length) {
      return Response.json({ authorities, note: "No legal database is connected, so citations could not be checked automatically." });
    }
    const updated = await verifyAuthorities(authorities as Authority[], sources);
    return Response.json({ authorities: updated, note: "Checked against connected databases." });
  } catch {
    return Response.json({ error: "Could not verify citations." }, { status: 400 });
  }
}
