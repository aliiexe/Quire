"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, KeyRound, Loader2, Monitor, Moon, ShieldCheck, Sparkles, Sun, X } from "lucide-react";

type Appearance = "light" | "dark" | "system";
type SettingsTab = "general" | "ai";
type AiProvider = "openai" | "anthropic" | "openrouter";

type AiSettings = {
  provider: AiProvider;
  providerLabel: string;
  model: string;
  keyConfigured: boolean;
};

type DesktopAiBridge = {
  getAiSettings?: (input?: { provider?: AiProvider }) => Promise<AiSettings>;
  saveAiSettings?: (input: { provider: AiProvider; apiKey?: string; model: string; removeApiKey?: boolean }) => Promise<AiSettings>;
};

const CUSTOM_MODEL = "__custom_model__";

const providers: Record<AiProvider, { label: string; keyLabel: string; keyPlaceholder: string; keyHelp: string }> = {
  openrouter: {
    label: "OpenRouter",
    keyLabel: "OpenRouter API key",
    keyPlaceholder: "sk-or-v1-…",
    keyHelp: "One key can access a broad model catalog. Its free router is subject to availability and provider limits.",
  },
  openai: {
    label: "OpenAI",
    keyLabel: "OpenAI API key",
    keyPlaceholder: "sk-…",
    keyHelp: "Use a key from your OpenAI account. Quire does not provide credits or bill for AI use.",
  },
  anthropic: {
    label: "Anthropic",
    keyLabel: "Anthropic API key",
    keyPlaceholder: "sk-ant-…",
    keyHelp: "Use a key from your Anthropic Console account. Quire does not provide credits or bill for AI use.",
  },
};

const curatedModels: Record<AiProvider, Array<{ id: string; label: string }>> = {
  openrouter: [
    { id: "openrouter/free", label: "Free models router — $0 when available" },
    { id: "~anthropic/claude-sonnet-latest", label: "Claude Sonnet latest — balanced" },
    { id: "~openai/gpt-latest", label: "GPT latest — capable" },
  ],
  openai: [
    { id: "gpt-5", label: "GPT-5 — best overall" },
    { id: "gpt-5-mini", label: "GPT-5 mini — fast and lower cost" },
    { id: "gpt-5-nano", label: "GPT-5 nano — lowest cost" },
    { id: "gpt-4.1", label: "GPT-4.1 — reliable writing" },
  ],
  anthropic: [
    { id: "claude-opus-5", label: "Claude Opus 5 — strongest reasoning" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5 — best balance" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — fastest" },
  ],
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
  const [provider, setProvider] = useState<AiProvider>("openrouter");
  const [model, setModel] = useState("openrouter/free");
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
        setProvider(settings.provider);
        setModel(settings.model);
        setKeyConfigured(settings.keyConfigured);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load AI Assistant settings.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const changeProvider = (nextProvider: AiProvider) => {
    if (nextProvider === provider) return;
    setProvider(nextProvider);
    setApiKey("");
    setError("");
    setNotice("");
    const bridge = aiBridge();
    if (!bridge?.getAiSettings) return;
    setLoading(true);
    void bridge.getAiSettings({ provider: nextProvider })
      .then((settings) => {
        setModel(settings.model);
        setKeyConfigured(settings.keyConfigured);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load that provider's settings."))
      .finally(() => setLoading(false));
  };

  const saveAiSettings = async () => {
    const bridge = aiBridge();
    if (!bridge?.saveAiSettings) {
      setError("AI Assistant settings are available in the Quire desktop app.");
      return;
    }
    if (!model.trim()) {
      setError("Choose a model or enter a custom model ID.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const settings = await bridge.saveAiSettings({ provider, apiKey, model });
      setProvider(settings.provider);
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
      const settings = await bridge.saveAiSettings({ provider, model, removeApiKey: true });
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
                  <p className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Choose OpenAI, Anthropic, or OpenRouter. Quire sends only the passage you select when you request a writing action—never a project in the background.</p>
                </div>

                <div className="rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
                  <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--quire-red)]" /><p className="text-sm leading-5 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">Private by default.</strong> Your key is encrypted with macOS Keychain and never shown again. The selected text goes directly to the provider when you choose an action; its data policies apply.</p></div>
                </div>

                {loading ? <div className="flex items-center gap-2 py-8 text-sm text-[var(--quire-muted)]"><Loader2 className="h-4 w-4 animate-spin" />Loading AI Assistant settings…</div> : <>
                  <div>
                    <label className="text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="ai-provider">Provider</label>
                    <select id="ai-provider" value={provider} onChange={(event) => changeProvider(event.target.value as AiProvider)} className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 py-2.5 text-sm font-medium outline-none focus:border-[var(--quire-red)]">
                      <option value="openrouter">OpenRouter — broad catalog, including free models</option>
                      <option value="openai">OpenAI — GPT models</option>
                      <option value="anthropic">Anthropic — Claude models</option>
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">OpenRouter is the simplest way to try many providers with one key; direct OpenAI and Anthropic connections are also available.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="ai-api-key">{providers[provider].keyLabel}</label>
                    <div className="mt-2 flex gap-2"><div className="relative min-w-0 flex-1"><KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--quire-muted)]" /><input id="ai-api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={keyConfigured ? "Key saved — paste to replace" : providers[provider].keyPlaceholder} className="w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--quire-red)]" /></div></div>
                    <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">{providers[provider].keyHelp}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="ai-model">Model</label>
                    <select id="ai-model" value={curatedModels[provider].some((option) => option.id === model) ? model : CUSTOM_MODEL} onChange={(event) => setModel(event.target.value === CUSTOM_MODEL ? "" : event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--quire-red)]">
                      {curatedModels[provider].map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      <option value={CUSTOM_MODEL}>Custom model ID…</option>
                    </select>
                    {!curatedModels[provider].some((option) => option.id === model) && <input aria-label="Custom model ID" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Enter a provider model ID" className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--quire-red)]" />}
                    <p className="mt-2 text-xs leading-5 text-[var(--quire-muted)]">Start with a curated model, or enter any text model ID that your selected provider supports.</p>
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
