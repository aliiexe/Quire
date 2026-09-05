import Link from "next/link";
import Image from "next/image";
import { QUIRE_REPOSITORY_URL } from "@/lib/links";
import { PlatformDownloadLink } from "./PlatformDownloadLink";

export function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-grid">
        <div className="mk-footer__top">
          <Image className="mk-footer__wordmark" src="/brand/quire-wordmark-light.png" alt="Quire" width={1280} height={631} />
          <nav className="mk-footer__links" aria-label="Footer navigation">
            <Link href="#product">Product</Link><Link href="#features">Features</Link>
            <Link href="#free">Free &amp; Open</Link><Link href="#faq">Questions</Link>
            <Link href="/privacy">Privacy</Link><a href={QUIRE_REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub</a><PlatformDownloadLink className="mk-footer__download" />
          </nav>
        </div>
        <div className="mk-footer__bottom"><span>© {new Date().getFullYear()} Quire</span><span>Free, open source, and local-first.</span></div>
      </div>
    </footer>
  );
}
