"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  FolderHeart,
  Laptop,
  Moon,
  Monitor,
  PanelLeft,
  Sparkles,
  Sun,
  WandSparkles,
  Zap,
} from "lucide-react";
import { applyThemeWithFade } from "@/lib/theme";

export type OnboardingTemplate = "blank" | "article" | "report" | "thesis";

export interface OnboardingPreferences {
  autoCompile: boolean;
  compiler: "pdflatex" | "xelatex" | "lualatex";
  synctex: boolean;
}

interface FirstLaunchProps {
  onComplete: (preferences?: OnboardingPreferences) => void;
  onCreateProject: (input: { name: string; template: OnboardingTemplate } & OnboardingPreferences) => Promise<boolean>;
  onOpenExisting: (preferences: OnboardingPreferences) => void;
}

type Scene = "blank" | "mark" | "clouds" | "message" | "setup";
type SetupStep = "appearance" | "workspace" | "rhythm" | "start";
type Appearance = "light" | "dark" | "system";

const message = "Write in peace. Compile with confidence.";

const stepLabels: Array<{ id: SetupStep; label: string }> = [
  { id: "appearance", label: "Atmosphere" },
  { id: "workspace", label: "Workspace" },
  { id: "rhythm", label: "Rhythm" },
  { id: "start", label: "Begin" },
];

const templateDetails: Record<OnboardingTemplate, { title: string; description: string; eyebrow: string }> = {
  blank: { title: "Blank document", description: "A quiet page, ready for your first line.", eyebrow: "START EMPTY" },
  article: { title: "Article", description: "A clean, versatile structure for everyday writing.", eyebrow: "EVERYDAY WRITING" },
  report: { title: "Report", description: "Organized sections for research and longer work.", eyebrow: "STRUCTURED WORK" },
  thesis: { title: "Thesis", description: "A considered foundation for chapters and citations.", eyebrow: "LONG-FORM" },
};

function resolvedTheme(appearance: Appearance) {
  if (appearance !== "system") return appearance;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function FirstLaunch({ onComplete, onCreateProject, onOpenExisting }: FirstLaunchProps) {
  const [scene, setScene] = useState<Scene>("blank");
  const [step, setStep] = useState<SetupStep>("appearance");
  const [typedMessage, setTypedMessage] = useState("");
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [workspace, setWorkspace] = useState<"documents" | "custom">("documents");
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    autoCompile: true,
    compiler: "pdflatex",
    synctex: true,
  });
  const [template, setTemplate] = useState<OnboardingTemplate>("article");
  const [projectName, setProjectName] = useState("Untitled Article");
  const [isCreating, setIsCreating] = useState(false);
  const [isChoosingFolder, setIsChoosingFolder] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [creationError, setCreationError] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    const syncPlatform = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("quire:theme");
      setAppearance(savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system");
      const desktop = (window as Window & {
        quireDesktop?: { enterOnboarding?: () => Promise<void> };
      }).quireDesktop;
      setIsDesktop(Boolean(desktop));
      // Local browser state can be reset independently of the native app
      // preferences. Always resize the native window when this UI appears.
      void desktop?.enterOnboarding?.();
    }, 0);

    const resumeAt = window.sessionStorage.getItem("quire:onboarding-resume");
    if (resumeAt === "rhythm") {
      window.sessionStorage.removeItem("quire:onboarding-resume");
      const resume = window.setTimeout(() => {
        setScene("setup");
        setStep("rhythm");
      }, 0);
      return () => {
        window.clearTimeout(syncPlatform);
        window.clearTimeout(resume);
      };
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reduceMotion = window.setTimeout(() => setScene("setup"), 0);
      return () => {
        window.clearTimeout(syncPlatform);
        window.clearTimeout(reduceMotion);
      };
    }

    let cancelled = false;
    let animationFrame: number | undefined;
    let visibilityFallback: number | undefined;
    const timers: number[] = [];
    let started = false;
    const startSequence = () => {
      if (cancelled || started) return;
      started = true;
      timers.push(
        window.setTimeout(() => setScene("mark"), 1100),
        window.setTimeout(() => setScene("clouds"), 3700),
        window.setTimeout(() => setScene("message"), 5700),
        window.setTimeout(() => setScene("setup"), 9300),
      );
    };

    const desktop = (window as Window & {
      quireDesktop?: { whenWindowVisible?: () => Promise<void> };
    }).quireDesktop;

    if (desktop?.whenWindowVisible) {
      // Windows may display the native window just before the renderer begins
      // waiting for its ready signal. Fall back gracefully so setup never
      // remains on its initial blank scene.
      visibilityFallback = window.setTimeout(startSequence, 350);
      void desktop.whenWindowVisible().then(() => {
        if (visibilityFallback !== undefined) window.clearTimeout(visibilityFallback);
        startSequence();
      }).catch(startSequence);
    } else {
      animationFrame = window.requestAnimationFrame(startSequence);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(syncPlatform);
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      if (visibilityFallback !== undefined) window.clearTimeout(visibilityFallback);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (scene !== "message") return;

    let index = 0;
    const writer = window.setInterval(() => {
      index += 1;
      setTypedMessage(message.slice(0, index));
      if (index >= message.length) window.clearInterval(writer);
    }, 44);

    return () => window.clearInterval(writer);
  }, [scene]);

  const activeStepIndex = useMemo(
    () => stepLabels.findIndex((item) => item.id === step),
    [step],
  );

  function applyAppearance(nextAppearance: Appearance) {
    const nextTheme = resolvedTheme(nextAppearance);
    setAppearance(nextAppearance);
    applyThemeWithFade(nextTheme);
    const desktop = (window as Window & {
      quireDesktop?: { setWindowAppearance?: (appearance: "light" | "dark") => Promise<void> };
    }).quireDesktop;
    void desktop?.setWindowAppearance?.(nextTheme);

    if (nextAppearance === "system") {
      window.localStorage.removeItem("quire:theme");
    } else {
      window.localStorage.setItem("quire:theme", nextAppearance);
    }
  }

  function persistPreferences() {
    window.localStorage.setItem("quire:onboarding-complete", "true");
    window.localStorage.setItem("quire:default-project-settings", JSON.stringify(preferences));
    const desktop = (window as Window & {
      quireDesktop?: { completeOnboarding: () => Promise<void> };
    }).quireDesktop;
    void desktop?.completeOnboarding();
  }

  function moveTo(nextStep: SetupStep) {
    setStep(nextStep);
  }

  function skipSetup() {
    persistPreferences();
    onComplete(preferences);
  }

  function selectTemplate(nextTemplate: OnboardingTemplate) {
    setTemplate(nextTemplate);
    setProjectName(`Untitled ${templateDetails[nextTemplate].title}`);
  }

  async function chooseWorkspace() {
    const desktop = (window as Window & {
      quireDesktop?: { chooseWorkspace: () => Promise<{ path?: string; cancelled?: boolean; unavailable?: boolean }> };
    }).quireDesktop;

    if (!desktop) return;

    setFolderError("");
    setIsChoosingFolder(true);

    try {
      window.sessionStorage.setItem("quire:onboarding-resume", "rhythm");
      const result = await desktop.chooseWorkspace();
      if (result.path) {
        setWorkspace("custom");
        return;
      }

      window.sessionStorage.removeItem("quire:onboarding-resume");
      setIsChoosingFolder(false);
      if (result.unavailable) setFolderError("Choose a folder is available in the packaged Quire app.");
    } catch {
      window.sessionStorage.removeItem("quire:onboarding-resume");
      setFolderError("Quire could not set that folder. Please try again.");
      setIsChoosingFolder(false);
    }
  }

  async function createProject() {
    if (!projectName.trim() || isCreatingRef.current) return;

    isCreatingRef.current = true;
    setIsCreating(true);
    setCreationError("");
    try {
      const created = await Promise.race([
        onCreateProject({
          name: projectName.trim(),
          template,
          ...preferences,
        }),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 20000)),
      ]);

      if (created) persistPreferences();
      else setCreationError("Quire could not create that workspace. Check the name and try again, or open an existing project.");
    } catch {
      setCreationError("Quire could not create that workspace. Please try again.");
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  }

  function openExisting() {
    persistPreferences();
    onOpenExisting(preferences);
  }

  return (
    <section className={`quire-onboarding quire-onboarding--${scene}`} aria-label="Set up Quire">
      <div className="quire-onboarding__cloud quire-onboarding__cloud--far" aria-hidden="true" />
      <div className="quire-onboarding__cloud quire-onboarding__cloud--near" aria-hidden="true" />

      <button type="button" className="quire-onboarding__skip" onClick={skipSetup}>
        Skip setup
      </button>

      <div className="quire-onboarding__arrival" aria-hidden={scene === "setup"}>
        <Image
          className="quire-onboarding__mark"
          src="/brand/quire-mark-light.png"
          alt=""
          width={631}
          height={631}
          priority
        />
        <p className="quire-onboarding__promise">
          {typedMessage}
          <span aria-hidden="true" className="quire-onboarding__cursor" />
        </p>
      </div>

      <div className="quire-onboarding__setup" aria-hidden={scene !== "setup"}>
        <div className="quire-onboarding__setup-header">
          <div className="quire-onboarding__brandline">
            <Image src="/brand/quire-mark-dark.png" alt="Quire" width={631} height={631} />
            <span>First launch</span>
          </div>
          <div className="quire-onboarding__progress" aria-label={`Step ${activeStepIndex + 1} of ${stepLabels.length}`}>
            {stepLabels.map((item, index) => (
              <span key={item.id} className={index <= activeStepIndex ? "is-active" : ""}>{item.label}</span>
            ))}
          </div>
        </div>

        <div className="quire-onboarding__card" key={step}>
          {step === "appearance" && (
            <>
              <div className="quire-onboarding__eyebrow"><Sparkles size={14} /> Make it yours</div>
              <h1>Choose your atmosphere.</h1>
              <p>Quire follows your lead. Change this any time from the workspace.</p>
              <div className="quire-onboarding__choice-grid quire-onboarding__choice-grid--appearance">
                {([
                  ["light", "Light", "Warm and clear", Sun],
                  ["dark", "Dark", "Quiet and focused", Moon],
                  ["system", "Match this computer", "Always in step", Monitor],
                ] as const).map(([id, title, description, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    className={`quire-onboarding__appearance-card quire-onboarding__appearance-card--${id} ${appearance === id ? "is-selected" : ""}`}
                    aria-pressed={appearance === id}
                    onClick={() => applyAppearance(id)}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <strong>{title}</strong>
                    <span>{description}</span>
                    <i><Check size={13} strokeWidth={2.5} /></i>
                  </button>
                ))}
              </div>
              <div className="quire-onboarding__actions">
                <span>We recommend matching your computer.</span>
                <button type="button" className="quire-onboarding__primary" onClick={() => moveTo("workspace")}>Continue <ArrowRight size={16} /></button>
              </div>
            </>
          )}

          {step === "workspace" && (
            <>
              <div className="quire-onboarding__eyebrow"><FolderHeart size={14} /> Your writing, your place</div>
              <h1>Choose where your work lives.</h1>
              <p>Quire projects are plain files. They stay on your computer, ready whenever you are.</p>
              <div className="quire-onboarding__workspace-options">
                <button type="button" className={`quire-onboarding__workspace-card ${workspace === "documents" ? "is-selected" : ""}`} onClick={() => setWorkspace("documents")}>
                  <span className="quire-onboarding__folder-icon"><FolderHeart size={22} /></span>
                  <span><strong>Documents/Quire</strong><small>The recommended home for all your projects.</small></span>
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  className={`quire-onboarding__workspace-card ${workspace === "custom" ? "is-selected" : ""}`}
                  onClick={chooseWorkspace}
                  disabled={!isDesktop || isChoosingFolder}
                >
                  <span className="quire-onboarding__folder-icon"><Laptop size={22} /></span>
                  <span><strong>{isChoosingFolder ? "Opening folder picker…" : "Choose a folder"}</strong><small>{isDesktop ? "Pick a home from anywhere on your computer." : "Available in the downloaded desktop app."}</small></span>
                  {workspace === "custom" ? <Check size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
              {folderError ? <p className="quire-onboarding__error" role="alert">{folderError}</p> : null}
              <div className="quire-onboarding__actions">
                <button type="button" className="quire-onboarding__secondary" onClick={() => moveTo("appearance")}>Back</button>
                <button type="button" className="quire-onboarding__primary" onClick={() => moveTo("rhythm")}>Continue <ArrowRight size={16} /></button>
              </div>
            </>
          )}

          {step === "rhythm" && (
            <>
              <div className="quire-onboarding__eyebrow"><WandSparkles size={14} /> Set your writing rhythm</div>
              <h1>Shape the workspace.</h1>
              <p>These are your starting defaults. Every project remains yours to tune.</p>
              <div className="quire-onboarding__rhythm-list">
                <label className="quire-onboarding__switch-row">
                  <span><Zap size={18} /><span><strong>Auto-compile</strong><small>Build when your source is ready.</small></span></span>
                  <input type="checkbox" checked={preferences.autoCompile} onChange={(event) => setPreferences((current) => ({ ...current, autoCompile: event.target.checked }))} />
                  <i aria-hidden="true" />
                </label>
                <label className="quire-onboarding__switch-row">
                  <span><PanelLeft size={18} /><span><strong>SyncTeX</strong><small>Keep source and PDF in step.</small></span></span>
                  <input type="checkbox" checked={preferences.synctex} onChange={(event) => setPreferences((current) => ({ ...current, synctex: event.target.checked }))} />
                  <i aria-hidden="true" />
                </label>
                <div className="quire-onboarding__compiler-row">
                  <span><FileText size={18} /><span><strong>Default compiler</strong><small>Used for new projects.</small></span></span>
                  <Select.Root value={preferences.compiler} onValueChange={(compiler) => setPreferences((current) => ({ ...current, compiler: compiler as OnboardingPreferences["compiler"] }))}>
                    <Select.Trigger className="quire-onboarding__select" aria-label="Default compiler">
                      <Select.Value />
                      <ChevronDown size={15} aria-hidden="true" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content position="popper" sideOffset={8} collisionPadding={16} className="quire-onboarding__select-content">
                        <Select.Viewport>
                          <Select.Item value="pdflatex" className="quire-onboarding__select-item"><Select.ItemText>pdfLaTeX</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>
                          <Select.Item value="xelatex" className="quire-onboarding__select-item"><Select.ItemText>XeLaTeX</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>
                          <Select.Item value="lualatex" className="quire-onboarding__select-item"><Select.ItemText>LuaLaTeX</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>
              <div className="quire-onboarding__actions">
                <button type="button" className="quire-onboarding__secondary" onClick={() => moveTo("workspace")}>Back</button>
                <button type="button" className="quire-onboarding__primary" onClick={() => moveTo("start")}>Continue <ArrowRight size={16} /></button>
              </div>
            </>
          )}

          {step === "start" && (
            <>
              <div className="quire-onboarding__eyebrow"><Sparkles size={14} /> Your workspace is ready</div>
              <h1>What are you making today?</h1>
              <p>Start from a quiet page, or let Quire make the first structure for you.</p>
              <div className="quire-onboarding__template-grid">
                {(Object.keys(templateDetails) as OnboardingTemplate[]).map((id) => {
                  const detail = templateDetails[id];
                  return (
                    <button key={id} type="button" className={`quire-onboarding__template-card ${template === id ? "is-selected" : ""}`} onClick={() => selectTemplate(id)}>
                      <span>{detail.eyebrow}</span>
                      <strong>{detail.title}</strong>
                      <small>{detail.description}</small>
                      {template === id ? <i><Check size={14} strokeWidth={2.5} /></i> : null}
                    </button>
                  );
                })}
              </div>
              <label className="quire-onboarding__project-name">
                <span>Give it a name</span>
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createProject(); }} placeholder="Untitled document" />
              </label>
              {creationError ? <p className="quire-onboarding__error" role="alert">{creationError}</p> : null}
              <div className="quire-onboarding__actions">
                <button type="button" className="quire-onboarding__secondary" onClick={openExisting}>Open an existing project</button>
                <button type="button" className="quire-onboarding__primary" disabled={!projectName.trim() || isCreating} onClick={() => void createProject()}>
                  {isCreating ? "Preparing…" : "Create workspace"} <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
