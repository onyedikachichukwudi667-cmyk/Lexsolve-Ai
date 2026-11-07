import { verifyIdToken, isAdminUser } from "@/lib/server/auth";
import { ALL_SOURCES } from "@/lib/research/sources";

// Server-side authorization for admin features. Reports which integrations are configured
// WITHOUT ever returning a secret value.
export async function GET(req: Request) {
  const user = await verifyIdToken(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(user))) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({
    ai: {
      keySet: Boolean(process.env.AI_API_KEY),
      baseUrl: process.env.AI_BASE_URL || "(default Gemini endpoint)",
      model: process.env.AI_MODEL || "(default)",
      embedModel: process.env.EMBED_MODEL || "(default)",
    },
    sources: ALL_SOURCES.map((s) => ({ id: s.id, name: s.name, configured: s.isConfigured() })),
  });
}
