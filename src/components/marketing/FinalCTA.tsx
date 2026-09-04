"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function FinalCTA() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".cta-elem",
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 md:py-48 bg-[#111111] text-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
        <h2 className="cta-elem opacity-0 text-5xl md:text-7xl font-medium tracking-tight">Your next document starts here.</h2>
        <div className="cta-elem opacity-0 mt-12">
          <a href="/app" className="inline-flex items-center justify-center bg-white text-black px-8 py-4 rounded-full text-xl font-medium hover:scale-105 transition-transform">
            Download Quire Free
          </a>
        </div>
      </div>
    </section>
  );
}
