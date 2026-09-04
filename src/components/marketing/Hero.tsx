"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function Hero() {
  const container = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .fromTo("[data-hero=eyebrow]", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .55 })
      .fromTo("[data-hero=title]", { opacity: 0, y: 42 }, { opacity: 1, y: 0, duration: 1.05 }, "-=.18")
      .fromTo("[data-hero=lede]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .65 }, "-=.55")
      .fromTo("[data-hero=actions]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .55 }, "-=.42");
  }, { scope: container });

  return (
    <section ref={container} className="mk-hero mk-atmosphere relative overflow-hidden">
      <div className="mk-grid">
        <div className="mk-hero__copy">
          <p data-hero="eyebrow" className="mk-eyebrow">Local LaTeX workspace</p>
          <h1 data-hero="title" className="mk-hero__title">Write beautifully.<br />Compile locally.</h1>
          <p data-hero="lede" className="mk-hero__lede">A calm, modern home for writing, compiling, and previewing LaTeX right on your machine.</p>
          <div data-hero="actions" className="mk-hero__actions">
            <Link href="/app" className="mk-button mk-button--light">Open Quire <ArrowUpRight size={16} strokeWidth={2.3} /></Link>
            <a href="https://github.com/quire/quire" target="_blank" rel="noreferrer" className="mk-button mk-button--ghost">View on GitHub</a>
          </div>
        </div>
      </div>
      <div className="mk-hero__fade" aria-hidden="true" />
    </section>
  );
}
