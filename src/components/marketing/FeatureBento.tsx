"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function FeatureBento() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".bento-box",
      { y: 40, opacity: 0 },
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
    <section ref={containerRef} className="py-24 md:py-32 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="mb-16">
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight">Everything you need.</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 auto-rows-[300px]">
        
        {/* Tall */}
        <div className="bento-box opacity-0 md:col-span-1 md:row-span-2 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col justify-end overflow-hidden relative">
           <div className="absolute top-8 left-8 right-8 bottom-48 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm flex items-center justify-center">
             <div className="text-neutral-400 dark:text-neutral-500 font-mono text-sm">BibTeX natively</div>
           </div>
           <div>
             <h3 className="text-2xl font-medium mb-2">Reference Management</h3>
             <p className="text-neutral-600 dark:text-neutral-400">Seamlessly integrate your BibTeX files. Autocomplete citations and manage your bibliography with ease.</p>
           </div>
        </div>

        {/* Wide */}
        <div className="bento-box opacity-0 md:col-span-2 md:row-span-1 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
           <div className="flex-1 w-full text-left">
             <h3 className="text-2xl font-medium mb-2">Native Performance</h3>
             <p className="text-neutral-600 dark:text-neutral-400">Built for speed. Quire leverages native processing to handle massive documents with thousands of pages without breaking a sweat.</p>
           </div>
           <div className="w-full md:w-1/2 h-full bg-gradient-to-bl from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-800/50 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm min-h-[160px]">
           </div>
        </div>

        {/* Small 1 */}
        <div className="bento-box opacity-0 md:col-span-1 md:row-span-1 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col justify-between overflow-hidden">
           <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold text-xl mb-4">
             T
           </div>
           <div>
             <h3 className="text-xl font-medium mb-2">Modern Typography</h3>
             <p className="text-neutral-600 dark:text-neutral-400 text-sm">Crisp, beautiful fonts for both editor and UI.</p>
           </div>
        </div>

        {/* Small 2 */}
        <div className="bento-box opacity-0 md:col-span-1 md:row-span-1 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col justify-between overflow-hidden">
           <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-bold text-xl mb-4">
             {`{}`}
           </div>
           <div>
             <h3 className="text-xl font-medium mb-2">Smart Snippets</h3>
             <p className="text-neutral-600 dark:text-neutral-400 text-sm">Accelerate typing with customizable LaTeX macros.</p>
           </div>
        </div>

      </div>
    </section>
  );
}
