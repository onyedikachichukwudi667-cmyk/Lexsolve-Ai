import { z } from "zod";
import { verifyIdToken } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/ratelimit";
import { embed, safeMessage } from "@/lib/server/llm";

const schema = z.object({ inputs: z.array(z.string().min(1).max(4000)).min(1).max(24) });

export async function POST(req: Request) {
  const user = await verifyIdToken(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`embed:${user.uid}`, 40)) return Response.json({ error: "Too many requests." }, { status: 429 });
  try {
    const { inputs } = schema.parse(await req.json());
    return Response.json({ vectors: await embed(inputs) });
  } catch (e) {
    return Response.json({ error: safeMessage(e) }, { status: 400 });
  }
}
