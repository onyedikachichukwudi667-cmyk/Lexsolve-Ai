// Provider-agnostic client for any OpenAI-compatible API. Configure with env vars only,
// so upgrading the model never needs a code change.
function cfg() {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  return { key, base };
}

export function parseJson<T>(raw: string): T {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1)) as T;
    throw new Error("MODEL_BAD_JSON");
  }
}

export async function chatJson<T>(opts: {
  system: string;
  user: string;
  model?: string;
  maxTokens?: number;
}): Promise<T> {
  const { key, base } = cfg();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opts.model || process.env.AI_MODEL || "gemini-2.5-flash",
      temperature: 0.2,
      max_tokens: opts.maxTokens ?? 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`MODEL_HTTP_${res.status}`);
  const json: any = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("MODEL_EMPTY");
  return parseJson<T>(text);
}

export async function embed(inputs: string[]): Promise<number[][]> {
  const { key, base } = cfg();
  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.EMBED_MODEL || "gemini-embedding-001", input: inputs }),
  });
  if (!res.ok) throw new Error(`EMBED_HTTP_${res.status}`);
  const json: any = await res.json();
  const data = (json?.data || []) as { embedding: number[] }[];
  if (data.length !== inputs.length) throw new Error("EMBED_MISMATCH");
  return data.map((d) => d.embedding.map((n) => Math.round(n * 1e5) / 1e5));
}

export function safeMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : "";
  if (m === "AI_NOT_CONFIGURED") return "The AI model is not configured on the server yet (missing AI_API_KEY).";
  if (m.startsWith("MODEL_HTTP_429")) return "The AI provider is rate limiting requests. Wait a minute and try again.";
  if (m.startsWith("MODEL_HTTP_")) return "The AI provider returned an error. Check the API key and model name.";
  if (m === "MODEL_BAD_JSON") return "The model returned an unreadable answer. Please try again.";
  return "Something went wrong while generating the answer. Please try again.";
}
