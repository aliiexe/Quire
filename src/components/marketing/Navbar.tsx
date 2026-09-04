import Link from "next/link";
import { siteConfig } from "@/lib/marketing/config";
import { QuireWordmark } from "@/components/brand/logo";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--quire-border)] bg-[var(--quire-bg)]/80 backdrop-blur">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6 md:px-12">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <QuireWordmark className="w-[90px] h-[26px]" />
          </Link>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link href="#features" className="text-sm font-medium text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">Pricing</Link>
          <Link href="#faq" className="text-sm font-medium text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">FAQ</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link 
            href="/app"
            className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--quire-text)] px-4 py-2 text-sm font-medium text-[var(--quire-bg)] shadow transition-colors hover:bg-[var(--quire-text)]/90"
          >
            Open Quire
          </Link>
        </div>
      </div>
    </header>
  );
}
