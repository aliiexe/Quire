import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-grid">
        <div className="mk-footer__top">
          <Image className="mk-footer__wordmark" src="/brand/quire-wordmark-light.png" alt="Quire" width={1280} height={631} />
          <nav className="mk-footer__links" aria-label="Footer navigation">
            <Link href="#product">Product</Link><Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link><Link href="#faq">Questions</Link>
            <a href="https://github.com/quire/quire" target="_blank" rel="noreferrer">GitHub</a><Link href="/app">Open Quire</Link>
          </nav>
        </div>
        <div className="mk-footer__bottom"><span>© {new Date().getFullYear()} Quire</span><span>Write beautifully. Compile locally.</span></div>
      </div>
    </footer>
  );
}
