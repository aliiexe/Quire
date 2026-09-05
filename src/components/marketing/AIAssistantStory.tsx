import { KeyRound, MousePointer2, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { QUIRE_MAC_DOWNLOAD_URL } from "@/lib/links";

const promises = [
  { icon: KeyRound, title: "Your provider", body: "Choose OpenAI, Anthropic, or OpenRouter in Settings. Quire never provides, sees, or reuses your key." },
  { icon: MousePointer2, title: "Only what you select", body: "Choose the passage and the task. Nothing else in the project is sent automatically." },
  { icon: ShieldCheck, title: "Always your decision", body: "Review every suggestion before it reaches the document. Your voice remains in charge." },
];

export function AIAssistantStory() {
  return (
    <section id="ai-assistant" className="mk-ai-story">
      <div className="mk-grid mk-ai-story__grid">
        <div className="mk-ai-story__copy">
          <p className="mk-eyebrow"><Sparkles size={14} aria-hidden="true" /> AI Assistant</p>
          <h2 className="mk-display">A thoughtful second set of eyes.</h2>
          <p className="mk-ai-story__lede">Find a clearer sentence, fix a rough passage, or make a paragraph shorter—without handing your work over to an impersonal editor.</p>
          <p className="mk-ai-story__note">Built for careful writing, not shortcuts. Quire preserves your meaning and never rewrites in the background.</p>
          <a href={QUIRE_MAC_DOWNLOAD_URL} className="mk-button mk-button--light">Try AI Assistant in Quire <WandSparkles size={16} /></a>
        </div>

        <div className="mk-ai-story__demo" aria-label="An example of the AI Assistant reviewing selected writing">
          <div className="mk-ai-story__window-bar"><span /><span /><span /><strong>Writing Assistant</strong></div>
          <div className="mk-ai-story__selection">
            <span>Selected text</span>
            <p>“This research aims to show the importance of a thoughtful writing process.”</p>
          </div>
          <div className="mk-ai-story__response">
            <div className="mk-ai-story__response-icon"><Sparkles size={17} /></div>
            <div>
              <span>Suggested refinement</span>
              <p>“This research examines why a thoughtful writing process matters.”</p>
              <small>Clearer and more direct, while keeping your meaning.</small>
            </div>
          </div>
          <div className="mk-ai-story__actions"><span>Keep original</span><strong>Use suggestion</strong></div>
        </div>
      </div>

      <div className="mk-grid mk-ai-story__promises">
        {promises.map(({ icon: Icon, title, body }) => (
          <article key={title}>
            <Icon aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
