"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function Pricing() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".pricing-elem",
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
    <section ref={containerRef} className="py-32 md:py-48 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="mb-24 text-center">
        <h2 className="pricing-elem opacity-0 text-5xl md:text-7xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50">
          Simple pricing.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        
        {/* Local (Dominant) */}
        <div className="pricing-elem opacity-0 rounded-3xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black p-10 flex flex-col shadow-2xl relative overflow-hidden scale-100 lg:scale-105 z-10">
          <div className="mb-8">
            <h3 className="text-3xl font-medium mb-2">Local</h3>
            <p className="text-neutral-400 dark:text-neutral-600">Everything you need, offline.</p>
          </div>
          <div className="mb-12">
            <span className="text-6xl font-medium tracking-tight">Free</span>
            <span className="text-neutral-400 dark:text-neutral-600 ml-2">forever</span>
          </div>
          <ul className="space-y-4 mb-12 flex-1">
            <li className="flex items-center gap-3">
              <CheckIcon /> Unlimited documents
            </li>
            <li className="flex items-center gap-3">
              <CheckIcon /> Local compilation engine
            </li>
            <li className="flex items-center gap-3">
              <CheckIcon /> Instant PDF preview
            </li>
            <li className="flex items-center gap-3">
              <CheckIcon /> BibTeX support
            </li>
          </ul>
          <a href="/app" className="w-full py-4 rounded-full bg-white dark:bg-black text-black dark:text-white text-center font-medium hover:opacity-90 transition-opacity">
            Download Now
          </a>
        </div>

        {/* Cloud (Muted) */}
        <div className="pricing-elem opacity-0 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-10 flex flex-col opacity-60">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h3 className="text-3xl font-medium mb-2">Cloud</h3>
              <p className="text-neutral-500">Sync across devices.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider bg-neutral-200 dark:bg-neutral-800 px-3 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="mb-12">
            <span className="text-6xl font-medium tracking-tight">$7</span>
            <span className="text-neutral-500 ml-2">/ month</span>
          </div>
          <ul className="space-y-4 mb-12 flex-1 text-neutral-500">
             <li className="flex items-center gap-3"><CheckIcon /> Everything in Local</li>
             <li className="flex items-center gap-3"><CheckIcon /> Cloud sync</li>
             <li className="flex items-center gap-3"><CheckIcon /> Web editor access</li>
             <li className="flex items-center gap-3"><CheckIcon /> Version history</li>
          </ul>
          <button disabled className="w-full py-4 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 font-medium cursor-not-allowed">
            Join Waitlist
          </button>
        </div>

        {/* Team (Muted) */}
        <div className="pricing-elem opacity-0 rounded-3xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-10 flex flex-col opacity-60">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h3 className="text-3xl font-medium mb-2">Team</h3>
              <p className="text-neutral-500">Collaborate in real-time.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wider bg-neutral-200 dark:bg-neutral-800 px-3 py-1 rounded-full">Coming soon</span>
          </div>
          <div className="mb-12">
            <span className="text-6xl font-medium tracking-tight">$15</span>
            <span className="text-neutral-500 ml-2">/ user / month</span>
          </div>
          <ul className="space-y-4 mb-12 flex-1 text-neutral-500">
             <li className="flex items-center gap-3"><CheckIcon /> Everything in Cloud</li>
             <li className="flex items-center gap-3"><CheckIcon /> Multiplayer editing</li>
             <li className="flex items-center gap-3"><CheckIcon /> Commenting system</li>
             <li className="flex items-center gap-3"><CheckIcon /> Shared bibliographies</li>
          </ul>
          <button disabled className="w-full py-4 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 font-medium cursor-not-allowed">
            Join Waitlist
          </button>
        </div>

      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
