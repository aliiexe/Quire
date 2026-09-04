"use client";

import { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import * as Accordion from "@radix-ui/react-accordion";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: "Do I need an internet connection to use Quire?",
    answer: "No. Quire is completely offline-first. The compiler and preview engine run entirely on your device."
  },
  {
    question: "How does the auto-compile feature work?",
    answer: "Quire ships with a lightweight, optimized LaTeX engine built-in. When you save your document, we process only the changed parts and instantly update the PDF preview via a fast IPC bridge."
  },
  {
    question: "Can I use my own LaTeX packages?",
    answer: "Yes. Quire supports standard TeX Live and MiKTeX distributions if you prefer to use them, or you can drop custom .sty files into your project directory."
  },
  {
    question: "Is my data private?",
    answer: "Absolutely. Since everything runs locally, none of your documents or data ever touch our servers. Your research is completely private."
  }
];

export function FAQ() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.fromTo(
      ".faq-elem",
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
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
    <section ref={containerRef} className="py-24 md:py-32 max-w-4xl mx-auto px-6 lg:px-8">
      <div className="mb-16">
        <h2 className="faq-elem opacity-0 text-3xl md:text-5xl font-medium tracking-tight">Frequently asked questions.</h2>
      </div>

      <Accordion.Root className="faq-elem opacity-0 border-t border-neutral-200 dark:border-neutral-800" type="single" collapsible>
        {faqs.map((faq, i) => (
          <Accordion.Item key={i} value={`item-${i}`} className="border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <Accordion.Header>
              <Accordion.Trigger className="flex flex-1 items-center justify-between py-6 font-medium transition-all hover:text-neutral-600 dark:hover:text-neutral-300 w-full text-left text-lg md:text-xl group">
                {faq.question}
                <div className="w-8 h-8 rounded-full border border-neutral-200 dark:border-neutral-800 flex items-center justify-center transition-transform duration-300 group-data-[state=open]:rotate-180">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 12L1.5 6L2.56066 4.93934L7.5 9.87868L12.4393 4.93934L13.5 6L7.5 12Z" fill="currentColor"/>
                  </svg>
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden text-neutral-600 dark:text-neutral-400 text-base md:text-lg data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="pb-6 pr-12">
                {faq.answer}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
