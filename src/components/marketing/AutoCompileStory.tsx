"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FileText, PenLine, Play, Save } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  { title: "Edit with focus.", body: "A quiet editor gives source the space it deserves, with generous type, subdued syntax, and only the information you need.", label: "Edit", icon: PenLine },
  { title: "Save without thinking.", body: "Your open files make their state clear. Save when you choose, or keep auto compile ready for the moment you pause.", label: "Save", icon: Save },
  { title: "Compile locally.", body: "Run a real local build from the workspace. No upload, no queue, and no hand-off to a remote editor.", label: "Compile", icon: Play },
  { title: "See the document.", body: "The continuous PDF preview stays beside your source with page controls, fit width, zoom, and download when it is ready.", label: "Preview", icon: FileText },
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
  const SelectedIcon = selected.icon;

  return (
    <section ref={section} className="mk-workflow">
      <div className="mk-grid mk-workflow__pin">
          <div className="mk-workflow__visual">
            <div className="mk-workflow__brand-stage">
            <SelectedIcon key={selected.label} className="mk-workflow__step-illustration" strokeWidth={1.25} aria-hidden="true" />
            </div>
          </div>
        <div>
          <div className="mk-workflow__copy" key={selected.label}>
            <p className="mk-workflow__index"><SelectedIcon className="h-3.5 w-3.5" aria-hidden="true" />{selected.label}</p>
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
          </div>
          <div className="mk-workflow__progress" aria-label="Workflow steps">
            {steps.map((step, index) => <button key={step.label} type="button" aria-label={step.label} aria-current={active === index} onClick={() => setActive(index)} />)}
          </div>
          <div className="mk-workflow__mobile-steps">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <article key={step.label} className="mk-workflow__mobile-step">
                  <p className="mk-workflow__index"><StepIcon className="h-3.5 w-3.5" aria-hidden="true" />{step.label}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
