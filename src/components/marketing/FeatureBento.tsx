import { FileOutput, FolderTree, PenLine, Sparkles, SunMoon } from "lucide-react";

const features = [
  { icon: PenLine, title: "A considered editor", description: "A calm CodeMirror surface, softened syntax, generous spacing, and tabs that belong to the document instead of the chrome." },
  { icon: FileOutput, title: "A real PDF preview", description: "Continuous pages, page tracking, zoom, fit width, and download in a reader designed to disappear behind the work." },
  { icon: FolderTree, title: "A tidy project home", description: "Keep chapters, assets, and bibliography in a clean file explorer. Upload images and PDFs, then read them in place without leaving the workspace." },
  { icon: SunMoon, title: "A workspace that adapts", description: "Light and dark appearances are designed as equals, with the same warmth, contrast, and familiar Quire red marker." },
  { icon: Sparkles, title: "Quire Draft", description: "Bring your own provider key, add a direction to selected text, then preview every suggested change in the editor before you apply or reject it." },
];

export function FeatureBento() {
  return (
    <section id="features" className="mk-features">
      <div className="mk-grid">
        <p className="mk-eyebrow text-[var(--quire-red)]">Inside Quire</p>
        <h2 className="mk-display mt-5 max-w-[760px]">Small details. Better writing.</h2>
        <div className="mk-feature-list">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="mk-feature" key={title}>
              <span className="mk-feature__mark" aria-hidden="true"><Icon /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
