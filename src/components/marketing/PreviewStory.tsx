"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";


gsap.registerPlugin(ScrollTrigger);

export function PreviewStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".preview-elem",
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
        }
      }
    );
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="py-32 md:py-48 bg-[#191919] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <h2 className="preview-elem text-4xl md:text-6xl font-medium tracking-tight opacity-0">
            Source and output.<br/>Side by side.
          </h2>
          <p className="preview-elem mt-6 text-xl text-neutral-400 opacity-0">
            See exactly how your document will look instantly. No more context switching or guessing what the final PDF will resemble.
          </p>
        </div>
        
        {!imageError ? (
          <div className="preview-elem opacity-0 relative rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-900 mx-auto max-w-6xl aspect-[16/9]">
            <img
              src="/marketing/preview-story.png"
              alt="Live Preview"
              className="w-full h-full absolute inset-0 object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="preview-elem opacity-0 max-w-5xl mx-auto grid grid-cols-2 gap-4 h-[60vh] min-h-[400px]">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 flex flex-col">
              <div className="h-4 w-1/3 bg-neutral-800 rounded mb-6"></div>
              <div className="space-y-4 flex-1">
                <div className="h-3 w-full bg-neutral-800 rounded"></div>
                <div className="h-3 w-full bg-neutral-800 rounded"></div>
                <div className="h-3 w-3/4 bg-neutral-800 rounded"></div>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-white p-8 flex flex-col text-black">
               <div className="h-6 w-1/2 bg-neutral-200 rounded mb-8 font-serif"></div>
               <div className="space-y-6 flex-1">
                <div className="h-4 w-full bg-neutral-100 rounded"></div>
                <div className="h-4 w-full bg-neutral-100 rounded"></div>
                <div className="h-4 w-5/6 bg-neutral-100 rounded"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
