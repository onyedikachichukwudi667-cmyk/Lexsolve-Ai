import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface AuthedUser {
  uid: string;
  token: string;
  email?: string;
}

// Verifies a Firebase ID token without firebase-admin (which does not run on Workers).
export async function verifyIdToken(req: Request): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) return null;
    return { uid: String(payload.sub), token, email: payload.email as string | undefined };
  } catch {
    return null;
  }
}

function fromValue(v: any): any {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)])
    );
  return null;
}

// Reads one Firestore document through the REST API using the CALLER's ID token,
// so Firestore security rules still apply. No service account is needed.
export async function readDoc(token: string, path: string): Promise<Record<string, any> | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const json: any = await res.json();
  return Object.fromEntries(Object.entries(json.fields || {}).map(([k, v]) => [k, fromValue(v)]));
}

// Server-side admin check: admins/{uid} must exist (only creatable from the Firebase console).
export async function isAdminUser(user: AuthedUser): Promise<boolean> {
  return (await readDoc(user.token, `admins/${user.uid}`)) !== null;
}
