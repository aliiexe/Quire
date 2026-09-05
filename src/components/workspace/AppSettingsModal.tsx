"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, KeyRound, Loader2, Monitor, Moon, ShieldCheck, Sparkles, Sun, X } from "lucide-react";

type Appearance = "light" | "dark" | "system";
type SettingsTab = "general" | "ai";

type AiSettings = {
  model: string;
  keyConfigured: boolean;
};

type DesktopAiBridge = {
  getAiSettings?: () => Promise<AiSettings>;
  saveAiSettings?: (input: { apiKey?: string; model: string; removeApiKey?: boolean }) => Promise<AiSettings>;
};

function aiBridge() {
  return (window as Window & { quireDesktop?: DesktopAiBridge }).quireDesktop;
}

interface AppSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
}

export function AppSettingsModal({ open, onOpenChange, appearance, onAppearanceChange }: AppSettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("general");
  const [model, setModel] = useState("gpt-5-mini");
  const [apiKey, setApiKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open || !aiBridge()?.getAiSettings) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void aiBridge()?.getAiSettings?.()
      .then((settings) => {
        if (cancelled) return;
        setModel(settings.model);
        setKeyConfigured(settings.keyConfigured);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load AI Assistant settings.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const saveAiSettings = async () => {
    const bridge = aiBridge();
    if (!bridge?.saveAiSettings) {
      setError("AI Assistant settings are available in the Quire desktop app.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const settings = await bridge.saveAiSettings({ apiKey, model });
      setModel(settings.model);
      setKeyConfigured(settings.keyConfigured);
      setApiKey("");
      setNotice(settings.keyConfigured ? "AI Assistant is ready on this Mac." : "Model preference saved. Add an API key to use the assistant.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save AI Assistant settings.");
    } finally {
      setSaving(false);
    }
  };

  const removeAiKey = async () => {
    const bridge = aiBridge();
    if (!bridge?.saveAiSettings) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const settings = await bridge.saveAiSettings({ model, removeApiKey: true });
      setKeyConfigured(settings.keyConfigured);
      setApiKey("");
      setNotice("The saved API key was removed from this Mac.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove the API key.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] flex max-h-[min(44rem,calc(100vh-2rem))] w-[min(calc(100vw-2rem),48rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-[0_26px_90px_rgba(0,0,0,.3)] outline-none">
          <aside className="hidden w-44 shrink-0 border-r border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-3 sm:block">
            <Dialog.Title className="px-2 pb-4 pt-1 text-sm font-semibold tracking-[-0.02em]">Settings</Dialog.Title>
            <nav className="grid gap-1" aria-label="Settings sections">
              <button type="button" onClick={() => setTab("general")} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${tab === "general" ? "bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-sm" : "text-[var(--quire-muted)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"}`}>
                <Monitor className="h-4 w-4" /> General
              </button>
              <button type="button" onClick={() => setTab("ai")} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${tab === "ai" ? "bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-sm" : "text-[var(--quire-muted)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"}`}>
                <Sparkles className="h-4 w-4" /> AI Assistant
              </button>
            </nav>
          </aside>

          <section className="min-w-0 flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold tracking-[-0.04em] sm:hidden">Settings</Dialog.Title>
                <p className="mt-1 text-sm text-[var(--quire-muted)]">{tab === "general" ? "Shape Quire around the way you work." : "Bring your own key. Quire never provides or sees your account."}</p>
              </div>
              <Dialog.Close className="rounded-lg p-2 text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]" aria-label="Close settings"><X className="h-4 w-4" /></Dialog.Close>
            </div>

            <div className="mb-5 flex gap-1 border-b border-[var(--quire-border)] pb-3 sm:hidden">
              <button type="button" onClick={() => setTab("general")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "general" ? "bg-[var(--quire-hover)] text-[var(--quire-text)]" : "text-[var(--quire-muted)]"}`}>General</button>
              <button type="button" onClick={() => setTab("ai")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === "ai" ? "bg-[var(--quire-hover)] text-[var(--quire-text)]" : "text-[var(--quire-muted)]"}`}>AI Assistant</button>
            </div>

            {tab === "general" ? (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-bold tracking-[0.13em] text-[var(--quire-muted)]">APPEARANCE</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em]">Make Quire feel like yours.</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Choose an appearance now; you can change it again at any time.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["system", "light", "dark"] as const).map((option) => {
                    const Icon = option === "system" ? Monitor : option === "light" ? Sun : Moon;
                    return <button key={option} type="button" onClick={() => onAppearanceChange(option)} className={`rounded-xl border p-4 text-left transition-all ${appearance === option ? "border-[var(--quire-red)] bg-[var(--quire-red-soft)] shadow-sm" : "border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] hover:border-[var(--quire-muted)]"}`}><Icon className="h-5 w-5" /><div className="mt-7 text-sm font-semibold capitalize">{option === "system" ? "Match my Mac" : option}</div><div className="mt-1 text-xs text-[var(--quire-muted)]">{option === "system" ? "Follow macOS" : option === "light" ? "Warm and clear" : "Quiet and focused"}</div></button>;
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] text-[var(--quire-red)]"><Sparkles className="h-3.5 w-3.5" /> AI ASSISTANT</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em]">Your key. Your choice.</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Quire uses your own OpenAI API key only when you request a writing action. It sends only the passage you select, never a project in the background.</p>
                </div>

                <div className="rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
                  <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--quire-red)]" /><p className="text-sm leading-5 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">Private by default.</strong> Your key is encrypted with macOS Keychain and never shown again. The selected text goes directly to the provider when you choose an action; its data policies apply.</p></div>
                </div>

                {loading ? <div className="flex items-center gap-2 py-8 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Loading AI Assistant settings…</div> : <>
                  <div>
                    <label className="text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="ai-api-key">OpenAI API key</label>
                    <div className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--quire-muted)]" /><input id="ai-api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={keyConfigured ? "Key saved — paste to replace" : "sk-…"} className="w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--quire-red)]" /></div></div>
                    <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">Create and manage API keys in your OpenAI account. Quire does not provide credits or bill for AI use.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="ai-model">Model</label>
                    <input id="ai-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-5-mini" className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--quire-red)]" />
                    <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">Use a text model available to your own OpenAI account.</p>
                  </div>
                  {error && <p role="alert" className="text-sm text-[var(--quire-red)]">{error}</p>}
                  {notice && <p className="flex items-center gap-1.5 text-sm text-[#5d875b]"><Check className="h-4 w-4" />{notice}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--quire-border)] pt-5">
                    {keyConfigured ? <button type="button" disabled={saving} onClick={() => void removeAiKey()} className="text-sm font-semibold text-[var(--quire-muted)] hover:text-[var(--quire-red)] disabled:opacity-60">Remove saved key</button> : <span />}
                    <button type="button" disabled={saving} onClick={() => void saveAiSettings()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--quire-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save AI Assistant</button>
                  </div>
                </>}
              </div>
            )}
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
