"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, FilePenLine, Loader2, Sparkles, X } from "lucide-react";

export type WritingSelection = {
  from: number;
  to: number;
  text: string;
};

type AssistantMode = "improve" | "correct" | "shorten" | "explain" | "custom" | "draft";

type DesktopAiBridge = {
  getAiSettings?: () => Promise<{ providerLabel: string; model: string; keyConfigured: boolean }>;
  assistWriting?: (input: { selection: string; mode: AssistantMode; instruction?: string }) => Promise<{ output: string }>;
};

function aiBridge() {
  return (window as Window & { quireDesktop?: DesktopAiBridge }).quireDesktop;
}

interface WritingAssistantProps {
  selection: WritingSelection | null;
  activeFileName: string | null;
  onPreviewSuggestion: (replacement: string, selection: WritingSelection) => boolean;
  onPreviewDocument: (replacement: string) => boolean;
}

const actions: Array<{ id: Exclude<AssistantMode, "draft" | "custom">; label: string; description: string }> = [
  { id: "improve", label: "Improve", description: "Clarity and flow" },
  { id: "correct", label: "Fix errors", description: "Grammar and punctuation" },
  { id: "shorten", label: "Shorten", description: "Keep the meaning, use fewer words" },
  { id: "explain", label: "Review", description: "Practical editorial feedback" },
];

export function WritingAssistant({ selection, activeFileName, onPreviewSuggestion, onPreviewDocument }: WritingAssistantProps) {
  const [open, setOpen] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [providerLabel, setProviderLabel] = useState("AI provider");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [working, setWorking] = useState(false);
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<AssistantMode>("improve");
  const [workspaceMode, setWorkspaceMode] = useState<"selection" | "draft">("selection");
  const [brief, setBrief] = useState("");
  const [instruction, setInstruction] = useState("");
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
      .then((settings) => {
        if (cancelled) return;
        setKeyConfigured(settings.keyConfigured);
        setProviderLabel(settings.providerLabel);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not read Quire Draft settings."); })
      .finally(() => { if (!cancelled) setLoadingSettings(false); });
    return () => { cancelled = true; };
  }, [open]);

  const chooseWorkspaceMode = (nextMode: "selection" | "draft") => {
    setWorkspaceMode(nextMode);
    setOutput("");
    setError("");
    setNotice("");
  };

  const requestAssistance = async (nextMode: AssistantMode) => {
    const bridge = aiBridge();
    const requestText = nextMode === "draft" ? brief.trim() : selection?.text.trim();
    if (!requestText) {
      setError(nextMode === "draft" ? "Describe the document you want to make first." : "Select the passage you want help with in the editor first.");
      return;
    }
    if (nextMode === "custom" && !instruction.trim()) {
      setError("Write your request first, then Quire Draft can follow it.");
      return;
    }
    if (!bridge?.assistWriting) {
      setError("Quire Draft is available in the Quire desktop app.");
      return;
    }
    setMode(nextMode);
    setWorking(true);
    setError("");
    setNotice("");
    setOutput("");
    try {
      const result = await bridge.assistWriting({ selection: requestText, mode: nextMode, instruction: isDraft ? undefined : instruction.trim() || undefined });
      setOutput(result.output);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quire Draft could not complete that request.");
    } finally {
      setWorking(false);
    }
  };

  const previewSuggestion = () => {
    if (!selection || !output) return;
    if (onPreviewSuggestion(output, selection)) {
      setOpen(false);
      setOutput("");
      setNotice("");
    } else {
      setError("That selection changed, or another suggestion is already open. Apply or reject it before creating another one.");
    }
  };

  const previewDocumentDraft = () => {
    if (!output) return;
    if (onPreviewDocument(output)) {
      setOpen(false);
      setOutput("");
      setNotice("");
    } else {
      setError("Open an editable text file first, and finish reviewing any suggestion already in progress.");
    }
  };

  const isDraft = workspaceMode === "draft";

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) { setOutput(""); setError(""); setNotice(""); }
    }}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="fixed bottom-14 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-[linear-gradient(135deg,#ff2f2f,#cf1019)] px-3.5 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(191,13,25,.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(191,13,25,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quire-red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--quire-bg)]"
          title="Open Quire Draft"
          aria-label="Open Quire Draft"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/18 ring-1 ring-white/20"><Sparkles className="h-4 w-4" /></span>
          <span>Quire Draft</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[min(48rem,calc(100vh-2rem))] w-[min(calc(100vw-2rem),42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-6 text-[var(--quire-text)] shadow-[0_26px_90px_rgba(0,0,0,.3)] outline-none sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] text-[var(--quire-red)]"><Sparkles className="h-3.5 w-3.5" /> QUIRE DRAFT</div>
              <Dialog.Title className="mt-2 text-2xl font-semibold tracking-[-0.045em]">A thoughtful writing room.</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Refine a passage or start a complete LaTeX document from a brief. Preview every change in your editor, then apply or reject it.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]" aria-label="Close Quire Draft"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-1">
            <button type="button" onClick={() => chooseWorkspaceMode("selection")} className={`rounded-[9px] px-3 py-2 text-sm font-semibold transition-colors ${!isDraft ? "bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-sm" : "text-[var(--quire-muted)] hover:text-[var(--quire-text)]"}`}>Refine a passage</button>
            <button type="button" onClick={() => chooseWorkspaceMode("draft")} className={`rounded-[9px] px-3 py-2 text-sm font-semibold transition-colors ${isDraft ? "bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-sm" : "text-[var(--quire-muted)] hover:text-[var(--quire-text)]"}`}>Create a LaTeX draft</button>
          </div>

          {isDraft ? <div className="mt-5 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]"><FilePenLine className="h-3.5 w-3.5" /> WHAT ARE YOU MAKING?</div>
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} rows={6} placeholder="For example: a university thesis introduction about the effect of urban green spaces on wellbeing. Use a formal academic tone, clear section headings, and [citation needed] where evidence belongs." className="mt-3 w-full resize-y rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-3 text-sm leading-6 text-[var(--quire-text)] outline-none placeholder:text-[var(--quire-muted)] focus:border-[var(--quire-red)]" />
            <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">Quire Draft creates original source from your brief. It will not invent citations, evidence, or claims.</p>
          </div> : <>
            <div className="mt-5 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
              <div className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">SELECTED TEXT</div>
              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-[var(--quire-text-secondary)]">{selection?.text.trim() || "Select text in the editor before asking Quire Draft for help."}</p>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
              <label htmlFor="quire-draft-instruction" className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">WRITE YOUR OWN REQUEST</label>
              <textarea id="quire-draft-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={3} placeholder="For example: retain every LaTeX command, make this more confident, and keep the French academic tone." className="mt-2 w-full resize-y rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-3 text-sm leading-6 text-[var(--quire-text)] outline-none placeholder:text-[var(--quire-muted)] focus:border-[var(--quire-red)]" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-sm text-xs leading-5 text-[var(--quire-muted)]">Send this on its own, or choose a quick action below to use it as extra guidance.</p>
                <button type="button" disabled={working || !selection?.text.trim() || !instruction.trim()} onClick={() => void requestAssistance("custom")} className="inline-flex items-center gap-2 rounded-xl bg-[var(--quire-red)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"><Sparkles className="h-3.5 w-3.5" />Send my request</button>
              </div>
            </div>
          </>}

          {loadingSettings ? <div className="mt-5 flex items-center gap-2 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Checking your Quire Draft setup…</div> : !keyConfigured ? <div className="mt-5 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-red-soft)] p-4 text-sm leading-6 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">Add your own API key first.</strong> Go to Settings → Quire Draft to securely add a {providerLabel} API key on this Mac.</div> : isDraft ? <div className="mt-5 flex justify-end"><button type="button" disabled={working || !brief.trim()} onClick={() => void requestAssistance("draft")} className="inline-flex items-center gap-2 rounded-xl bg-[var(--quire-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45"><Sparkles className="h-4 w-4" />Create LaTeX draft</button></div> : <>
            <div className="mt-5 text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">OR USE A QUICK ACTION</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {actions.map((action) => <button key={action.id} type="button" disabled={working || !selection?.text.trim()} onClick={() => void requestAssistance(action.id)} className={`rounded-xl border p-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${mode === action.id ? "border-[var(--quire-red)] bg-[var(--quire-red-soft)]" : "border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] hover:border-[var(--quire-muted)]"}`}><div className="text-sm font-semibold">{action.label}</div><div className="mt-1 text-xs text-[var(--quire-muted)]">{action.description}</div></button>)}
            </div>
          </>}

          <p className="mt-4 text-xs leading-5 text-[var(--quire-muted)]">Quire Draft asks for original, voice-preserving writing and never claims to check plagiarism, citations, or AI detection. Your provider&apos;s data policy applies only to the text or brief you choose to send.</p>

          {working && <div className="mt-5 flex items-center gap-2 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />{mode === "draft" ? "Shaping your LaTeX draft…" : mode === "custom" ? "Following your direction…" : "Considering the selected passage…"}</div>}
          {error && <p role="alert" className="mt-5 text-sm leading-6 text-[var(--quire-red)]">{error}</p>}
          {notice && <p className="mt-5 flex items-center gap-1.5 text-sm text-[#5d875b]"><Check className="h-4 w-4" />{notice}</p>}

          {output && <div className="mt-5"><div className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">{mode === "explain" ? "EDITORIAL NOTES" : mode === "draft" ? "CREATED LATEX DRAFT" : "SUGGESTED REVISION"}</div><pre className={`mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4 text-sm leading-6 text-[var(--quire-text-secondary)] ${mode === "draft" ? "font-mono text-[13px]" : "font-sans"}`}>{output}</pre>{mode !== "explain" && <div className="mt-4 flex flex-col items-end gap-2"><button type="button" disabled={mode === "draft" && !activeFileName} onClick={mode === "draft" ? previewDocumentDraft : previewSuggestion} className="rounded-xl bg-[var(--quire-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45">Preview in editor</button><p className="text-right text-xs text-[var(--quire-muted)]">Nothing is changed or saved until you apply it.</p>{mode === "draft" && !activeFileName && <p className="text-xs text-[var(--quire-muted)]">Open a text file to place this draft.</p>}</div>}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
