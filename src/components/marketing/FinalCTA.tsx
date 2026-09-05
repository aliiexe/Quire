import { QUIRE_REPOSITORY_URL } from "@/lib/links";
import { PlatformDownloadLink } from "./PlatformDownloadLink";

export function FinalCTA() {
  return (
    <section className="mk-final mk-atmosphere relative overflow-hidden">
      <div className="mk-grid relative z-10">
        <p className="mk-eyebrow">A better home for LaTeX</p>
        <h2 className="mk-display">Your next document<br />starts here.</h2>
        <p>Choose the version for your computer—a calmer place to write, compile, and see the work as it takes shape.</p>
        <div className="mk-final__actions">
          <PlatformDownloadLink className="mk-button mk-button--light" showIcon />
          <a href={QUIRE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="mk-button mk-button--ghost">GitHub ↗</a>
        </div>
        <p className="mt-5 max-w-xl text-sm leading-6 text-white/70">
          Free, open-source desktop preview. The macOS build is not yet Apple-notarized; if macOS blocks its first launch, use <strong className="font-semibold text-white">System Settings → Privacy &amp; Security → Open Anyway</strong>. Windows may show Microsoft Defender SmartScreen until Quire is code-signed.
        </p>
      </div>
    </section>
  );
}
