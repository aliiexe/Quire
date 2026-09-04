export function LocalFirst() {
  return (
    <section className="mk-local">
      <div className="mk-grid">
        <p className="mk-eyebrow text-[var(--quire-red)]">Local by design</p>
        <h2 className="mk-display mt-5">Your files.<br />Your machine.</h2>
        <p>Quire keeps the work close: your project folder, your compiler, and your finished PDF all stay on your computer. Free locally. Forever.</p>
        <div className="mk-local__stats">
          <div className="mk-local__stat"><strong>∞</strong><span>Local projects</span></div>
          <div className="mk-local__stat"><strong>0</strong><span>Cloud compile quotas</span></div>
          <div className="mk-local__stat"><strong>100%</strong><span>Your files, where you expect them</span></div>
        </div>
      </div>
    </section>
  );
}
