import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mk-final mk-atmosphere relative overflow-hidden">
      <div className="mk-grid relative z-10">
        <p className="mk-eyebrow">A better home for LaTeX</p>
        <h2 className="mk-display">Your next document<br />starts here.</h2>
        <p>Open a calmer place to write, compile, and see the work as it takes shape.</p>
        <div className="mk-final__actions">
          <Link href="/app" className="mk-button mk-button--light">Open Quire <ArrowUpRight size={16} /></Link>
          <a href="https://github.com/quire/quire" target="_blank" rel="noreferrer" className="mk-button mk-button--ghost">GitHub ↗</a>
        </div>
      </div>
    </section>
  );
}
