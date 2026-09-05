import { QUIRE_DOWNLOADS_URL, QUIRE_REPOSITORY_URL } from "@/lib/links";

const release = {
  name: "Quire",
  price: "Free forever",
  details: "The complete desktop app · macOS and Windows · Local-first writing · PDF preview · Unlimited projects · No account or paid tier.",
};

export function Pricing() {
  return (
    <section id="free" className="mk-pricing">
      <div className="mk-grid">
        <p className="mk-eyebrow text-[var(--quire-red)]">Free &amp; open source</p>
        <h2 className="mk-display mt-5">Free for everyone.<br />Built in the open.</h2>
        <div className="mk-pricing__table">
          <article className="mk-price">
            <h3 className="mk-price__name">{release.name}</h3>
            <p className="mk-price__price">{release.price}</p>
            <p className="mk-price__detail">{release.details}</p>
            <div className="mk-price__actions">
              <a href={QUIRE_DOWNLOADS_URL} className="mk-button mk-button--dark">Download Quire</a>
              <a href={QUIRE_REPOSITORY_URL} target="_blank" rel="noreferrer" className="mk-price__source">Read the source</a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
