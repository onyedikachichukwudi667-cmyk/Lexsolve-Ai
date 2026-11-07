import { z } from "zod";
import { verifyIdToken } from "@/lib/server/auth";
import { loadSettings } from "@/lib/server/settings";
import { rateLimit } from "@/lib/server/ratelimit";
import { safeMessage } from "@/lib/server/llm";
import { runPipeline } from "@/lib/research/pipeline";
import type { SolveRequest, StreamEvent } from "@/lib/types";

const manual = z.object({
  id: z.string().max(80),
  kind: z.enum(["case", "statute"]),
  name: z.string().min(1).max(300),
  citation: z.string().max(200).optional(),
  court: z.string().max(200).optional(),
  year: z.number().int().min(1700).max(2100).optional(),
  section: z.string().max(100).optional(),
  facts: z.string().max(4000).optional(),
  issues: z.string().max(2000).optional(),
  holding: z.string().max(3000).optional(),
  ratio: z.string().max(3000).optional(),
  notes: z.string().max(3000).optional(),
});

const schema = z.object({
  question: z.string().min(20),
  subject: z.string().max(100),
  jurisdiction: z.string().max(100),
  method: z.enum(["IPAC", "IRAC"]),
  depth: z.enum(["quick", "standard", "deep"]),
  instructions: z.string().max(2000).optional(),
  userAuthorities: z.array(manual).max(15),
  libraryPassages: z
    .array(z.object({ docName: z.string().max(200), page: z.number().optional(), text: z.string().max(2500), kind: z.string().optional() }))
    .max(8),
  attachedDocs: z.array(z.object({ name: z.string().max(200), text: z.string().max(20000) })).max(3),
});

// Lets a full research run finish on hosts that cap function time (for example Vercel).
export const maxDuration = 60;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function POST(req: Request) {
  const user = await verifyIdToken(req);
  if (!user) return json({ error: "Please sign in again." }, 401);

  if (Number(req.headers.get("content-length") || 0) > 400_000) return json({ error: "Request too large." }, 413);

  const settings = await loadSettings(user.token);
  if (!rateLimit(`solve:${user.uid}`, settings.rateLimitPerMinute)) {
    return json({ error: "Too many requests. Please wait a minute." }, 429);
  }

  let body: SolveRequest;
  try {
    body = schema.parse(await req.json()) as SolveRequest;
  } catch {
    return json({ error: "Invalid request. Check the question is at least 20 characters." }, 400);
  }
  if (body.question.length > settings.maxQuestionChars) {
    return json({ error: `Question exceeds ${settings.maxQuestionChars} characters.` }, 400);
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: StreamEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        const data = await runPipeline(body, settings, emit);
        emit({ type: "result", data });
      } catch (err) {
        emit({ type: "error", message: safeMessage(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
  });
}
