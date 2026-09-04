export function PreviewStory() {
  return (
    <section className="mk-darkproof">
      <div className="mk-grid">
        <div className="mk-darkproof__top">
          <div>
            <p className="mk-eyebrow text-[#ff9089]">The Quire way</p>
            <h2 className="mk-display mt-5">Source and output.<br />One quiet place.</h2>
          </div>
          <p className="mk-darkproof__caption">Open the real workspace when you are ready. The landing page stays light, fast, and entirely focused on the writing experience.</p>
        </div>
        <div className="mk-darkproof__stage" aria-label="A local source file compiled into a PDF">
          <article className="mk-proof-card mk-proof-card--source">
            <div className="mk-proof-card__bar">
              <span>source.tex</span>
              <span>LaTeX</span>
            </div>
            <pre className="mk-proof-code" aria-hidden="true"><code><span className="mk-proof-code__muted">\documentclass</span>{`{article}`}<br /><span className="mk-proof-code__muted">\title</span>{`{A quiet beginning}`}<br /><br /><span className="mk-proof-code__muted">\begin</span>{`{document}`}<br />{`  `}The work starts here.<br /><span className="mk-proof-code__muted">\end</span>{`{document}`}</code></pre>
          </article>
          <div className="mk-proof-flow" aria-hidden="true"><span>Compile locally</span></div>
          <article className="mk-proof-card mk-proof-card--preview">
            <div className="mk-proof-card__bar">
              <span>paper.pdf</span>
              <span>PDF</span>
            </div>
            <div className="mk-proof-page" aria-hidden="true">
              <span>INTRODUCTION</span>
              <strong>A quiet beginning</strong>
              <i />
              <i />
              <i />
              <i className="mk-proof-page__short" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
