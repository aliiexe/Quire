"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function EditorStory() {
  const section = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo("[data-intro]", { opacity: 0, y: 28 }, {
      opacity: 1,
      y: 0,
      duration: .82,
      stagger: .12,
      ease: "power3.out",
      scrollTrigger: { trigger: section.current, start: "top 68%" },
    });
  }, { scope: section });

  return (
    <section ref={section} id="product" className="mk-intro">
      <div className="mk-grid">
        <div className="mk-intro__head">
          <div>
            <p data-intro className="mk-eyebrow text-[var(--quire-red)]">A better writing surface</p>
            <h2 data-intro className="mk-display mt-5">Made for the work, not the setup.</h2>
          </div>
          <div>
            <p data-intro className="mk-body">Quire keeps your source, build controls, and real PDF output together in one clear workspace. Nothing to configure before the ideas arrive.</p>
            <p data-intro className="mk-note"><span>01</span> A true local workspace with no cloud compile queue.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
