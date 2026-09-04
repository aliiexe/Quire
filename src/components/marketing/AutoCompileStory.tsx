"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { title: "Edit with focus.", body: "A quiet editor gives source the space it deserves, with generous type, subdued syntax, and only the information you need.", label: "Step 01 · Edit" },
  { title: "Save without thinking.", body: "Your open files make their state clear. Save when you choose, or keep auto compile ready for the moment you pause.", label: "Step 02 · Save" },
  { title: "Compile locally.", body: "Run a real local build from the workspace. No upload, no queue, and no hand-off to a remote editor.", label: "Step 03 · Compile" },
  { title: "See the document.", body: "The continuous PDF preview stays beside your source with page controls, fit width, zoom, and download when it is ready.", label: "Step 04 · Preview" },
];

export function AutoCompileStory() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const media = gsap.matchMedia();

    media.add("(min-width: 1024px)", () => {
      let current = -1;
      const trigger = ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "+=300%",
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const next = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
          if (next !== current) {
            current = next;
            setActive(next);
          }
        },
      });

      return () => trigger.kill();
    });

    return () => media.revert();
  }, { scope: section });

  const selected = steps[active];

  return (
    <section ref={section} className="mk-workflow">
      <div className="mk-grid mk-workflow__pin">
          <div className="mk-workflow__visual">
            <div className="mk-workflow__brand-stage">
            <span key={selected.label} className="mk-workflow__step-number">{String(active + 1).padStart(2, "0")}</span>
            </div>
          </div>
        <div>
          <div className="mk-workflow__copy" key={selected.label}>
            <p className="mk-workflow__index">{selected.label}</p>
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
          </div>
          <div className="mk-workflow__progress" aria-label="Workflow steps">
            {steps.map((step, index) => <button key={step.label} type="button" aria-label={step.label} aria-current={active === index} onClick={() => setActive(index)} />)}
          </div>
          <div className="mk-workflow__mobile-steps">
            {steps.map((step) => (
              <article key={step.label} className="mk-workflow__mobile-step">
                <p className="mk-workflow__index">{step.label}</p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
