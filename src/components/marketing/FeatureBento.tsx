const features = [
  ["01", "A considered editor", "A calm CodeMirror surface, softened syntax, generous spacing, and tabs that belong to the document instead of the chrome."],
  ["02", "A real PDF preview", "Continuous pages, page tracking, zoom, fit width, and download in a reader designed to disappear behind the work."],
  ["03", "A tidy project home", "Keep chapters, assets, and bibliography in a clean file explorer with persistent folder state and quiet, useful controls."],
  ["04", "A workspace that adapts", "Light and dark appearances are designed as equals, with the same warmth, contrast, and familiar Quire red marker."],
];

export function FeatureBento() {
  return (
    <section id="features" className="mk-features">
      <div className="mk-grid">
        <p className="mk-eyebrow text-[var(--quire-red)]">Inside Quire</p>
        <h2 className="mk-display mt-5 max-w-[760px]">Small details. Better writing.</h2>
        <div className="mk-feature-list">
          {features.map(([number, title, description]) => (
            <article className="mk-feature" key={number}>
              <span className="mk-feature__number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
