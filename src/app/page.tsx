import Link from "next/link";

const FEATURES = [
  ["Autonomous research", "Identifies the legal issues in your problem question, then searches connected legal databases with several queries per issue."],
  ["Honest verification", "Every authority carries a status: verified, retrieved, user provided, unverified or possibly outdated. Nothing is called verified without a source match."],
  ["IPAC and IRAC", "Choose your method. The answer applies the law to your facts instead of repeating definitions."],
  ["Your own library", "Upload notes, judgments and course materials. Passages are retrieved and cited with page numbers."],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between bg-navy px-5 py-4 text-white">
        <span className="font-heading text-xl font-semibold">Lex<span className="text-gold">Solve</span> AI</span>
        <Link href="/login" className="btn min-h-[40px] border border-white/30 text-white">Sign in</Link>
      </header>
      <section className="bg-navy px-5 pb-14 pt-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">For Nigerian law students</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold leading-tight">Solve problem questions with real legal research behind every answer.</h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">Not a chatbot guessing from memory. LexSolve researches, shows its sources, and tells you what it could not verify.</p>
          <Link href="/login" className="btn btn-gold mt-7">Get started</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-3xl gap-4 px-5 py-10 sm:grid-cols-2">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="card">
            <h2 className="font-heading text-lg font-semibold text-navy">{t}</h2>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
      <footer className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        LexSolve AI is a study aid. Always read the original authority before relying on it in coursework or practice.
      </footer>
    </div>
  );
}
