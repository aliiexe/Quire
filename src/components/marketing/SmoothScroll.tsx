"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SmoothScrollContext = createContext<(selector: string) => void>(() => {});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const reducedMotionRef = useRef(false);

  const scrollTo = useCallback((selector: string) => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;

    if (reducedMotionRef.current || !lenisRef.current) {
      const top = window.scrollY + target.getBoundingClientRect().top - 96;
      window.scrollTo({ top, behavior: "auto" });
      return;
    }

    lenisRef.current.scrollTo(target, { offset: -96 });
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedMotionRef.current = prefersReducedMotion;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(ticker);

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      gsap.ticker.remove(ticker);
    };
  }, []);

  return <SmoothScrollContext.Provider value={scrollTo}>{children}</SmoothScrollContext.Provider>;
}
