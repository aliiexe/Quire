import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { QuireWordmark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Privacy Policy — Quire",
  description: "Quire's privacy policy for its local-first macOS app.",
};

const effectiveDate = "5 September 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--quire-bg)] px-5 py-7 text-[var(--quire-text)] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between border-b border-[var(--quire-border)] pb-5">
          <Link href="/" aria-label="Back to Quire home" className="transition-opacity hover:opacity-70">
            <QuireWordmark className="h-auto w-28" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </header>

        <article className="py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] text-[var(--quire-red)]">
            <ShieldCheck className="h-3.5 w-3.5" /> LOCAL-FIRST PRIVACY
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-[var(--quire-muted)]">Effective {effectiveDate}</p>

          <div className="mt-12 space-y-10 text-[15px] leading-7 text-[var(--quire-text-secondary)] sm:text-base">
            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">The short version</h2>
              <p className="mt-3">Quire is a local-first macOS application. Your writing, project files, generated PDFs, and compiler output stay on your Mac in the workspace folder you choose. Quire has no account system, cloud sync, remote compiler, advertising, analytics, or telemetry built into the app. Quire Draft is optional and off until you add your own API key and deliberately request help with selected text or a writing brief.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">What the app accesses</h2>
              <p className="mt-3">Quire reads and writes files only within the local workspace you select or create, plus its local project settings and build output. It uses the TeX tools installed on your Mac to compile your documents. This processing happens on your device.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Information we do not collect</h2>
              <p className="mt-3">The desktop app does not require a sign-in, collect your name or email address, track how you use the app, or send diagnostic or usage data to Quire. It does not sell or share personal information because it does not collect it. Quire does not transmit your project content unless you deliberately use Quire Draft as described below.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">When a connection may happen</h2>
              <p className="mt-3">Quire runs a local service on your own Mac to power its interface. It is not a hosted workspace. Links to the website, GitHub, documentation, or other external services open only when you choose them; those services have their own privacy practices.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Optional Quire Draft</h2>
              <p className="mt-3">Quire Draft is disabled by default. If you choose to configure it, you provide your own API key for the provider you select, including direct providers, OpenRouter, or a compatible endpoint. Quire encrypts each saved key using macOS Keychain and does not show it back to you. When you explicitly choose a Quire Draft action, Quire sends only the passage you selected or writing brief you entered, together with the requested action, to your selected provider. It does not automatically send an entire project, compile output, or other files.</p>
              <p className="mt-3">Your selected provider processes any text you send under your own account and its applicable terms and data policies. If you use OpenRouter, its routing may send that text to the model provider you choose. Quire cannot control any provider&apos;s services or policies. Do not send confidential, personal, or sensitive material unless you are comfortable with the chosen provider&apos;s handling of it.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Your files and choices</h2>
              <p className="mt-3">You control your workspace and can inspect, copy, back up, export, or delete its files at any time. Removing an item from the desktop app moves it to macOS Trash. Your normal macOS backup, storage, and Trash settings determine how long local files remain on your device.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Security</h2>
              <p className="mt-3">Keeping files on your device does not replace normal security practices. Protect your Mac account, keep backups of important work, and install updates from trusted sources. If you open external links or add third-party LaTeX packages, their security and privacy practices are separate from Quire.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Changes to this policy</h2>
              <p className="mt-3">If Quire changes how the desktop app handles information, this page will be updated before or when that change is released. The effective date above shows the latest revision.</p>
            </section>

            <section className="rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--quire-text)]">Questions or privacy requests</h2>
              <p className="mt-3">For support, privacy questions, or requests about this policy, email:</p>
              <a href="mailto:alibourak.work@gmail.com" className="mt-4 inline-flex items-center gap-2 font-semibold text-[var(--quire-red)] hover:underline">
                <Mail className="h-4 w-4" /> alibourak.work@gmail.com
              </a>
            </section>

            <p className="border-t border-[var(--quire-border)] pt-8 text-sm text-[var(--quire-muted)]">Quire is open source under the <a className="font-semibold text-[var(--quire-text)] hover:underline" href="https://github.com/aliiexe/Quire/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License <ExternalLink className="inline h-3.5 w-3.5" /></a>.</p>
          </div>
        </article>
      </div>
    </main>
  );
}
