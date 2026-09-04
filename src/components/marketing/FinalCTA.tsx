import { Download } from "lucide-react";
import { QUIRE_MAC_DOWNLOAD_URL, QUIRE_REPOSITORY_URL } from "@/lib/links";

export function FinalCTA() {
  return (
    <section className="mk-final mk-atmosphere relative overflow-hidden">
      <div className="mk-grid relative z-10">
        <p className="mk-eyebrow">A better home for LaTeX</p>
        <h2 className="mk-display">Your next document<br />starts here.</h2>
        <p>Download the macOS app for a calmer place to write, compile, and see the work as it takes shape.</p>
        <div className="mk-final__actions">
          <a href={QUIRE_MAC_DOWNLOAD_URL} className="mk-button mk-button--light">Download for macOS <Download size={16} /></a>
          <a href={QUIRE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="mk-button mk-button--ghost">GitHub ↗</a>
        </div>
      </div>
    </section>
  );
}
