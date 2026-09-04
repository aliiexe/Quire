"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";


export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(".hero-text", { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      ".hero-text",
      { y: 80, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.15, duration: 1.2, ease: "power3.out" }
    );

    gsap.to(".cloud-1", {
      x: "-2%",
      y: "1%",
      duration: 25,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    gsap.to(".cloud-2", {
      x: "2%",
      y: "-1%",
      duration: 30,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative w-full min-h-screen flex flex-col items-center pt-32 pb-24 overflow-hidden bg-gradient-to-b from-[#2a0404] via-[#100000] to-[var(--quire-bg)]">
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 mix-blend-screen opacity-90">
        <div 
          className="cloud-layer cloud-1 absolute -inset-[10%] bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1509803874385-db7c23652552?q=80&w=2000')`,
            filter: 'contrast(1.4) saturate(2) hue-rotate(320deg) brightness(0.8)',
          }}
        />
        <div 
          className="cloud-layer cloud-2 absolute -inset-[10%] bg-cover bg-center mix-blend-overlay opacity-80"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=2000')`,
            filter: 'contrast(1.6) saturate(2.5) hue-rotate(340deg) brightness(0.9)',
          }}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[var(--quire-bg)] z-10 pointer-events-none" />

      <div className="relative z-20 flex flex-col items-center text-center px-6 lg:px-8 w-full max-w-7xl mx-auto mt-16 md:mt-24">
        <h1 className="text-[clamp(3.75rem,7vw,6.5rem)] font-bold tracking-tight text-[#fdfdfd] max-w-5xl leading-[1.05]">
          <div className="overflow-hidden pb-2">
            <span className="hero-text block opacity-0">Write beautifully.</span>
          </div>
          <div className="overflow-hidden pb-2">
            <span className="hero-text block opacity-0">Compile locally.</span>
          </div>
        </h1>
        <p className="hero-text mt-6 text-xl md:text-2xl text-white/70 max-w-2xl opacity-0 font-medium">
          A calmer place to write LaTeX. Fast, beautiful, and completely offline.
        </p>
        <div className="hero-text mt-12 flex gap-4 opacity-0">
          <a href="/app" className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            Get Started
          </a>
        </div>
      </div>
      
      <div className="relative z-20 hero-text mt-24 md:mt-32 w-full max-w-6xl mx-auto opacity-0 px-4 md:px-0">
        {!imageError ? (
          <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(180,0,0,0.25)] border border-white/10 bg-black/40 backdrop-blur-md">
            <img
              src="/marketing/quire-editor-light.png"
              alt="Quire Editor"
              width={2400}
              height={1600}
              className="w-full h-auto object-cover block dark:hidden"
              onError={() => setImageError(true)}
            />
            <img
              src="/marketing/quire-editor-dark.png"
              alt="Quire Editor"
              width={2400}
              height={1600}
              className="w-full h-auto object-cover hidden dark:block"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(180,0,0,0.3)] border border-white/10 bg-[#080000] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 to-black pointer-events-none" />
            <div className="text-[15rem] md:text-[25rem] font-serif italic font-bold text-white/5 select-none relative z-10 leading-none tracking-tighter">
              q
              <div className="absolute inset-0 blur-[100px] bg-red-600/40 -z-10 rounded-full scale-50" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] pointer-events-none opacity-90" />
          </div>
        )}
      </div>
    </section>
  );
}
