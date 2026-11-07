// Per-isolate sliding window. Good enough to stop casual abuse on the free plan.
// For strict global limits, swap this for a Cloudflare KV, Durable Object or the
// Workers Rate Limiting binding.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, perMinute: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
