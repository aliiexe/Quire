import { ArrowUpRight } from "lucide-react";

export function OpenSource() {
  return (
    <section id="open-source" className="mk-opensource">
      <div className="mk-grid mk-opensource__grid">
        <div>
          <p className="mk-eyebrow text-[#ff9089]">Open source</p>
          <h2 className="mk-display mt-5">Open by design.</h2>
        </div>
        <div>
          <p>Research tools should be inspectable, durable, and free to make your own. Quire uses open formats and keeps its local core open.</p>
          <a href="https://github.com/quire/quire" target="_blank" rel="noreferrer" className="mk-button mk-button--ghost mt-7">View on GitHub <ArrowUpRight size={16} /></a>
          <span className="mk-opensource__line">Your writing should outlast your software.</span>
        </div>
      </div>
    </section>
  );
}
