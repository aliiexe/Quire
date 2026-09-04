"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";


gsap.registerPlugin(ScrollTrigger);

export function AutoCompileStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      pin: rightColRef.current,
      pinSpacing: false,
    });

    const steps = gsap.utils.toArray<HTMLElement>(".compile-step");
    
    steps.forEach((step, i) => {
      gsap.fromTo(
        step,
        { opacity: 0.2 },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: step,
            start: "top center",
            end: "bottom center",
            scrub: true,
            toggleClass: "active-step",
          }
        }
      );
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative w-full max-w-7xl mx-auto px-6 lg:px-8 pb-32 md:pb-48">
      {/* We need some top padding to let the pinning kick in smoothly */}
      <div className="pt-32 md:pt-48">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left Column (Scrolling) */}
          <div ref={leftColRef} className="lg:col-span-1 space-y-[40vh] pb-[40vh]">
            <div className="compile-step text-4xl md:text-5xl font-medium tracking-tight">
              <h3>1. Edit seamlessly.</h3>
              <p className="mt-4 text-xl text-neutral-600 dark:text-neutral-400 font-normal">
                Type your LaTeX code as you normally would, with powerful autocomplete and syntax highlighting.
              </p>
            </div>
            
            <div className="compile-step text-4xl md:text-5xl font-medium tracking-tight">
              <h3>2. Hit save.</h3>
              <p className="mt-4 text-xl text-neutral-600 dark:text-neutral-400 font-normal">
                No need to run complex command-line scripts or configure build pipelines manually.
              </p>
            </div>

            <div className="compile-step text-4xl md:text-5xl font-medium tracking-tight">
              <h3>3. Auto-compile.</h3>
              <p className="mt-4 text-xl text-neutral-600 dark:text-neutral-400 font-normal">
                Quire uses its integrated engine to process your documents blazingly fast in the background.
              </p>
            </div>

            <div className="compile-step text-4xl md:text-5xl font-medium tracking-tight">
              <h3>4. Instant Preview.</h3>
              <p className="mt-4 text-xl text-neutral-600 dark:text-neutral-400 font-normal">
                Your PDF updates instantly. Everything is synced down to the precise line you are editing.
              </p>
            </div>
          </div>
          
          {/* Right Column (Pinned) */}
          <div className="hidden lg:block lg:col-span-1">
            <div ref={rightColRef} className="h-screen flex items-center justify-center sticky top-0">
              <div className="w-full relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 aspect-square flex items-center justify-center">
                {!imageError ? (
                  <img
                    src="/marketing/auto-compile.png"
                    alt="Auto Compile Workflow"
                    className="w-full h-full absolute inset-0 object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-neutral-300 dark:border-neutral-700 animate-spin-slow mx-auto mb-6"></div>
                    <p className="text-xl font-medium text-neutral-600 dark:text-neutral-400">Integrated Compilation Engine</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
