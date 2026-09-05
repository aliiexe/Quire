"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Sparkles, X } from "lucide-react";

export type WritingSelection = {
  from: number;
  to: number;
  text: string;
};

type AssistantMode = "improve" | "correct" | "shorten" | "explain";

type DesktopAiBridge = {
  getAiSettings?: () => Promise<{ model: string; keyConfigured: boolean }>;
  assistWriting?: (input: { selection: string; mode: AssistantMode }) => Promise<{ output: string }>;
};

function aiBridge() {
  return (window as Window & { quireDesktop?: DesktopAiBridge }).quireDesktop;
}

interface WritingAssistantProps {
  selection: WritingSelection | null;
  onApply: (replacement: string, selection: WritingSelection) => boolean;
}

const actions: Array<{ id: AssistantMode; label: string; description: string }> = [
  { id: "improve", label: "Improve", description: "Clarity and flow" },
  { id: "correct", label: "Fix errors", description: "Grammar and punctuation" },
  { id: "shorten", label: "Shorten", description: "Keep the meaning, use fewer words" },
  { id: "explain", label: "Review", description: "Practical editorial feedback" },
];

export function WritingAssistant({ selection, onApply }: WritingAssistantProps) {
  const [open, setOpen] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [working, setWorking] = useState(false);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<AssistantMode>("improve");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    const bridge = aiBridge();
    if (!bridge?.getAiSettings) return;
    let cancelled = false;
    setLoadingSettings(true);
    setError("");
    void bridge.getAiSettings()
      .then((settings) => { if (!cancelled) setKeyConfigured(settings.keyConfigured); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not read AI Assistant settings."); })
      .finally(() => { if (!cancelled) setLoadingSettings(false); });
    return () => { cancelled = true; };
  }, [open]);

  const requestAssistance = async (nextMode: AssistantMode) => {
    const bridge = aiBridge();
    if (!selection?.text.trim()) {
      setError("Select the passage you want help with in the editor first.");
      return;
    }
    if (!bridge?.assistWriting) {
      setError("AI Assistant is available in the Quire desktop app.");
      return;
    }
    setMode(nextMode);
    setWorking(true);
    setError("");
    setNotice("");
    setOutput("");
    try {
      const result = await bridge.assistWriting({ selection: selection.text, mode: nextMode });
      setOutput(result.output);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The AI Assistant could not complete that request.");
    } finally {
      setWorking(false);
    }
  };

  const applySuggestion = () => {
    if (!selection || !output) return;
    if (onApply(output, selection)) {
      setNotice("Applied to your editor. Review it like any other draft.");
    } else {
      setError("That selection changed while the assistant was working. Select it again and retry.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) { setOutput(""); setError(""); setNotice(""); }
    }}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--quire-border)] bg-[var(--quire-surface)] px-2.5 py-2 text-[11px] font-semibold text-[var(--quire-text-secondary)] shadow-sm transition-all hover:-translate-y-px hover:text-[var(--quire-text)] sm:px-3" title="Help with selected text">
          <Sparkles className="h-3.5 w-3.5 text-[var(--quire-red)]" /><span className="hidden sm:inline">AI Assistant</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[min(46rem,calc(100vh-2rem))] w-[min(calc(100vw-2rem),40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-6 text-[var(--quire-text)] shadow-[0_26px_90px_rgba(0,0,0,.3)] outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] text-[var(--quire-red)]"><Sparkles className="h-3.5 w-3.5" /> AI ASSISTANT</div>
              <Dialog.Title className="mt-2 text-2xl font-semibold tracking-[-0.045em]">Keep the writing yours.</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Select a passage, choose a focused action, then decide whether to apply the suggestion. Nothing changes until you choose.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]" aria-label="Close AI Assistant"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="mt-6 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
            <div className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">SELECTED TEXT</div>
            <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--quire-text-secondary)]">{selection?.text.trim() || "Select text in the editor before asking for help."}</p>
          </div>

          {loadingSettings ? <div className="mt-5 flex items-center gap-2 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Checking your AI Assistant setup…</div> : !keyConfigured ? <div className="mt-5 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-red-soft)] p-4 text-sm leading-6 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">Add your own API key first.</strong> Go to the dashboard&apos;s Settings → AI Assistant to securely add an OpenAI API key on this Mac.</div> : <>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {actions.map((action) => <button key={action.id} type="button" disabled={working || !selection?.text.trim()} onClick={() => void requestAssistance(action.id)} className={`rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${mode === action.id ? "border-[var(--quire-red)] bg-[var(--quire-red-soft)]" : "border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] hover:border-[var(--quire-muted)]"}`}><div className="text-sm font-semibold">{action.label}</div><div className="mt-1 text-xs text-[var(--quire-muted)]">{action.description}</div></button>)}
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--quire-muted)]">Quire asks for original, voice-preserving revisions and never claims to check plagiarism, citations, or AI detection. Your provider&apos;s data policy applies to the selected text you send.</p>
          </>}

          {working && <div className="mt-5 flex items-center gap-2 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Thinking about the selected passage…</div>}
          {error && <p role="alert" className="mt-5 text-sm leading-6 text-[var(--quire-red)]">{error}</p>}
          {notice && <p className="mt-5 flex items-center gap-1.5 text-sm text-[#5d875b]"><Check className="h-4 w-4" />{notice}</p>}

          {output && <div className="mt-5"><div className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">{mode === "explain" ? "EDITORIAL NOTES" : "SUGGESTED REVISION"}</div><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4 font-sans text-sm leading-6 text-[var(--quire-text-secondary)]">{output}</pre>{mode !== "explain" && <div className="mt-4 flex justify-end"><button type="button" onClick={applySuggestion} className="rounded-xl bg-[var(--quire-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px">Replace selection</button></div>}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
