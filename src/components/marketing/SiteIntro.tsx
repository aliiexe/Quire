"use client";

import Image from "next/image";
import { useEffect } from "react";

const INTRO_COMPLETE_EVENT = "quire:intro-complete";

export function SiteIntro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.quireIntro !== "playing") {
      root.dataset.quireIntro = "done";
      return;
    }

    const originalOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const fadeBackground = window.setTimeout(() => {
      root.dataset.quireIntro = "leaving";
    }, 2200);

    const finish = window.setTimeout(() => {
      root.dataset.quireIntro = "done";
      root.style.overflow = originalOverflow;
      try {
        window.sessionStorage.setItem("quire:intro-seen", "true");
      } catch {
        // Keep the visual experience functional when browser storage is unavailable.
      }
      window.dispatchEvent(new Event(INTRO_COMPLETE_EVENT));
    }, 3100);

    return () => {
      window.clearTimeout(fadeBackground);
      window.clearTimeout(finish);
      root.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="mk-site-intro" aria-hidden="true">
      <Image className="mk-site-intro__mark mk-site-intro__mark--on-light" src="/brand/quire-mark-dark.png" alt="" width={631} height={631} priority />
      <Image className="mk-site-intro__mark mk-site-intro__mark--on-dark" src="/brand/quire-mark-light.png" alt="" width={631} height={631} priority />
    </div>
  );
}
