"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function LocalFirst() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".local-text",
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.2,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 md:py-48 max-w-7xl mx-auto px-6 lg:px-8 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-[56px] leading-tight md:text-[96px] font-medium tracking-tighter text-neutral-900 dark:text-neutral-50 overflow-hidden">
          <span className="local-text block opacity-0">Your files.</span>
          <span className="local-text block opacity-0 text-neutral-400 dark:text-neutral-600">Your machine.</span>
        </h2>
        <p className="local-text opacity-0 mt-12 text-xl md:text-3xl text-neutral-600 dark:text-neutral-400 font-medium max-w-3xl leading-relaxed">
          Quire runs entirely on your local machine. No cloud uploads, no privacy concerns, no internet connection required. Your research remains exclusively yours.
        </p>
      </div>
    </section>
  );
}
