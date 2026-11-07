"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const MAIN = [
  { href: "/dashboard", label: "Home" },
  { href: "/solver", label: "Solve" },
  { href: "/research", label: "Research" },
  { href: "/library", label: "Library" },
];
const MORE = [
  { href: "/cases", label: "Case Explorer" },
  { href: "/history", label: "Answer History" },
  { href: "/saved", label: "Saved Questions" },
  { href: "/authorities", label: "My Authorities" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="grid min-h-screen place-items-center text-muted">Loading...</div>;
  const links = isAdmin ? [...MORE, { href: "/admin", label: "Admin" }] : MORE;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-navy px-4 py-3 text-white">
        <Link href="/dashboard" className="font-heading text-lg font-semibold">
          Lex<span className="text-gold">Solve</span> AI
        </Link>
        <button className="btn min-h-[40px] border border-white/30 text-white" onClick={() => setMenu(!menu)} aria-expanded={menu}>Menu</button>
      </header>
      {menu && (
        <nav className="border-b border-line bg-white p-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="block rounded-lg px-3 py-3 font-medium text-navy hover:bg-gold-soft">{l.label}</Link>
          ))}
          <button className="block w-full rounded-lg px-3 py-3 text-left font-medium text-red-700" onClick={() => signOut(auth)}>Sign out</button>
        </nav>
      )}
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white">
        {MAIN.map((l) => (
          <Link key={l.href} href={l.href} className={`py-4 text-center text-sm font-semibold ${path.startsWith(l.href) ? "text-gold" : "text-navy"}`}>{l.label}</Link>
        ))}
      </nav>
    </div>
  );
}
