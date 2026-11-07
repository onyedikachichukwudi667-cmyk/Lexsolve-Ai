import type { VerificationStatus } from "@/lib/types";

const MAP: Record<VerificationStatus, { text: string; cls: string }> = {
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  retrieved: { text: "Retrieved", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  user_provided: { text: "User provided", cls: "bg-gold-soft text-amber-900 border-amber-200" },
  unverified: { text: "Unverified", cls: "bg-red-50 text-red-800 border-red-200" },
  conflicting: { text: "Conflicting or outdated?", cls: "bg-orange-50 text-orange-800 border-orange-200" },
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const m = MAP[status];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${m.cls}`}>{m.text}</span>;
}
