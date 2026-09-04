"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function OpenSource() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".os-elem",
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 md:py-48 bg-[#111111] text-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
        <h2 className="os-elem opacity-0 text-5xl md:text-7xl font-medium tracking-tight">Open by design.</h2>
        <p className="os-elem opacity-0 mt-8 text-xl md:text-2xl text-neutral-400 font-medium max-w-2xl leading-relaxed">
          We believe research tools should be transparent. Quire is built on open standards and its core is open-source.
        </p>
        <div className="os-elem opacity-0 mt-12">
          <a href="https://github.com/quire" className="inline-flex items-center gap-2 border border-neutral-700 hover:bg-neutral-800 transition-colors px-6 py-3 rounded-full text-lg font-medium">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
