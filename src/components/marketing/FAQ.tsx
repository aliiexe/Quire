"use client";

import * as Accordion from "@radix-ui/react-accordion";

const faqs = [
  ["Does Quire need an internet connection?", "No. Quire is designed around a local workspace. Your project files, compiler, and preview run on your own machine."],
  ["Can I use an existing LaTeX project?", "Yes. Keep the folder structure you already use, or import an archive into a new Quire project and continue from there."],
  ["What does auto compile do?", "When it is enabled, Quire saves your changes and runs a local build after a short pause, then refreshes the preview when the build succeeds."],
  ["How does AI Assistant handle my writing?", "It is optional and uses your own OpenAI API key. You choose the exact passage and action, then review its suggestion before applying it. Quire never sends an entire project automatically or rewrites in the background."],
  ["Is Quire really free?", "Yes. Quire is free and open source, with no paid plans, accounts, or required cloud service. Your projects stay on your Mac."],
];

export function FAQ() {
  return (
    <section id="faq" className="mk-faq">
      <div className="mk-grid mk-faq__grid">
        <aside className="mk-faq__aside">
          <p className="mk-eyebrow text-[var(--quire-red)]">Questions?</p>
          <h2 className="mk-display mt-5">The useful kind.</h2>
          <p>Everything you need to know before opening your next document.</p>
        </aside>
        <Accordion.Root className="mk-faq__items" type="single" collapsible>
          {faqs.map(([question, answer]) => (
            <Accordion.Item className="mk-faq__item" key={question} value={question}>
              <Accordion.Header>
                <Accordion.Trigger className="mk-faq__trigger">
                  {question}<span className="mk-faq__plus" aria-hidden="true" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="mk-faq__answer">{answer}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
