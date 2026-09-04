import Link from "next/link";

const tiers = [
  { name: "Local", price: "Free forever", details: "Unlimited local projects · Local compilation · PDF preview · Auto compile · Light + dark", action: "Open Quire", href: "/app" },
  { name: "Cloud", price: "$7 / month", details: "Sync and browser access for your files. A future Quire release.", status: "Coming soon" },
  { name: "Team", price: "$15 / user / month", details: "Shared workspaces, comments, and team libraries. A future Quire release.", status: "Coming soon" },
];

export function Pricing() {
  return (
    <section id="pricing" className="mk-pricing">
      <div className="mk-grid">
        <p className="mk-eyebrow text-[var(--quire-red)]">Pricing</p>
        <h2 className="mk-display mt-5">Free locally.<br />Forever.</h2>
        <div className="mk-pricing__table">
          {tiers.map((tier) => (
            <article className="mk-price" key={tier.name}>
              <h3 className="mk-price__name">{tier.name}</h3>
              <p className="mk-price__price">{tier.price}</p>
              <p className="mk-price__detail">{tier.details}</p>
              {tier.href ? <Link href={tier.href} className="mk-button mk-button--dark">{tier.action}</Link> : <span className="mk-price__status">{tier.status}</span>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
