"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";


gsap.registerPlugin(ScrollTrigger);

export function EditorStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".story-text",
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 70%",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 md:py-48 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
        <div className="lg:col-span-5 flex flex-col justify-center">
          <h2 className="story-text text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50 opacity-0">
            A calmer place to write LaTeX.
          </h2>
          <p className="story-text mt-6 text-lg md:text-xl text-neutral-600 dark:text-neutral-400 opacity-0">
            Forget about archaic editors and complex setups. Quire gives you a distraction-free writing environment that lets you focus on your thoughts, not your tools.
          </p>
        </div>
        
        <div className="lg:col-span-7">
          {!imageError ? (
            <div className="story-text opacity-0 relative rounded-2xl overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 aspect-[4/3]">
              <img
                src="/marketing/editor-story.png"
                alt="Editor Experience"
                className="w-full h-full absolute inset-0 object-cover object-left"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="story-text opacity-0 w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center p-12 text-center border border-neutral-200 dark:border-neutral-800">
               <span className="text-neutral-400 dark:text-neutral-600 text-lg font-medium">Distraction-free environment</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
