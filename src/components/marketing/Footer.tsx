import Link from "next/link";
import { siteConfig } from "@/lib/marketing/config";

export function Footer() {
  return (
    <footer className="border-t border-[var(--quire-border)] bg-[var(--quire-surface)] py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight text-[var(--quire-text)]">{siteConfig.name}</span>
          </div>
          
          <div className="flex gap-6 text-sm text-[var(--quire-muted)]">
             <Link href="#features" className="hover:text-[var(--quire-text)] transition-colors">Features</Link>
             <Link href="#pricing" className="hover:text-[var(--quire-text)] transition-colors">Pricing</Link>
             <Link href="#faq" className="hover:text-[var(--quire-text)] transition-colors">FAQ</Link>
          </div>
          
          <div className="flex gap-4">
            <a href={siteConfig.links.github} target="_blank" rel="noreferrer" className="text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">
               GitHub
            </a>
            <a href={siteConfig.links.twitter} target="_blank" rel="noreferrer" className="text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">
               Twitter
            </a>
          </div>
        </div>
        
        <div className="mt-8 md:mt-12 text-center text-sm text-[var(--quire-muted)]">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
