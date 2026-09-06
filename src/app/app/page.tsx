"use client";

import Link from "next/link";
import { ArrowUpRight, CloudOff, FileArchive, FileText, FolderOpen, HardDrive, Loader2, Moon, Plus, Settings, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { QuireWordmark } from "@/components/brand/logo";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProjectSummary } from "@/lib/projects/storage";
import { FirstLaunch, type OnboardingPreferences, type OnboardingTemplate } from "@/components/onboarding/FirstLaunch";
import * as Dialog from "@radix-ui/react-dialog";
import { QUIRE_PRIVACY_POLICY_URL, QUIRE_WEBSITE_URL } from "@/lib/links";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { AppSettingsModal } from "@/components/workspace/AppSettingsModal";
import { applyThemeWithFade } from "@/lib/theme";

const initialProjectDefaults: OnboardingPreferences = {
  autoCompile: true,
  compiler: "pdflatex",
  synctex: true,
};

const projectTemplates: Array<{ id: OnboardingTemplate; eyebrow: string; title: string; description: string }> = [
  { id: "blank", eyebrow: "START EMPTY", title: "Blank document", description: "A quiet page, ready for your first line." },
  { id: "article", eyebrow: "EVERYDAY WRITING", title: "Article", description: "A clean, versatile structure for everyday writing." },
  { id: "report", eyebrow: "STRUCTURED WORK", title: "Report", description: "Organized sections for research and longer work." },
  { id: "thesis", eyebrow: "LONG-FORM", title: "Thesis", description: "A considered foundation for chapters and citations." },
];

type CompilerStatus = {
  platform: string;
  compilerAvailable: boolean;
  version?: string;
  installerName?: string;
  installerUrl?: string;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [projectActionError, setProjectActionError] = useState("");
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<ProjectSummary | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectTemplate, setNewProjectTemplate] = useState<OnboardingTemplate>("article");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [appearance, setAppearance] = useState<"light" | "dark" | "system">("system");
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [projectDefaults, setProjectDefaults] = useState<OnboardingPreferences>(initialProjectDefaults);
  const [compilerStatus, setCompilerStatus] = useState<CompilerStatus | null>(null);
  const [isCheckingCompiler, setIsCheckingCompiler] = useState(false);
  const router = useRouter();

  const refreshCompilerStatus = useCallback(async () => {
    const desktop = (window as Window & {
      quireDesktop?: { getCompilerStatus?: () => Promise<CompilerStatus> };
    }).quireDesktop;
    if (!desktop?.getCompilerStatus) return;

    setIsCheckingCompiler(true);
    try {
      setCompilerStatus(await desktop.getCompilerStatus());
    } finally {
      setIsCheckingCompiler(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    void refreshCompilerStatus().catch(() => undefined);
    const refreshAfterInstall = () => void refreshCompilerStatus().catch(() => undefined);
    window.addEventListener("focus", refreshAfterInstall);
    return () => window.removeEventListener("focus", refreshAfterInstall);
  }, [refreshCompilerStatus]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("quire:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextAppearance = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
    const nextTheme = nextAppearance === "dark" || (nextAppearance === "system" && prefersDark) ? "dark" : "light";
    applyThemeWithFade(nextTheme);
    setAppearance(nextAppearance);
    setTheme(nextTheme);
    const desktop = (window as Window & {
      quireDesktop?: { setWindowAppearance?: (appearance: "light" | "dark") => Promise<void> };
    }).quireDesktop;
    void desktop?.setWindowAppearance?.(nextTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeLaunch = async () => {
      try {
        const savedDefaults = localStorage.getItem("quire:default-project-settings");
        if (savedDefaults) {
          const parsed = JSON.parse(savedDefaults) as Partial<OnboardingPreferences>;
          if (
            typeof parsed.autoCompile === "boolean" &&
            typeof parsed.synctex === "boolean" &&
            (parsed.compiler === "pdflatex" || parsed.compiler === "xelatex" || parsed.compiler === "lualatex")
          ) {
            setProjectDefaults(parsed as OnboardingPreferences);
          }
        }

        const desktop = (window as Window & {
          quireDesktop?: { getLaunchState?: () => Promise<{ onboardingComplete: boolean }> };
        }).quireDesktop;
        const launchState = await desktop?.getLaunchState?.();
        const onboardingComplete = launchState?.onboardingComplete
          ?? localStorage.getItem("quire:onboarding-complete") === "true";

        if (!cancelled) {
          // The native completion record is authoritative in the desktop app,
          // so a cleared browser cache cannot replay setup after first launch.
          if (launchState?.onboardingComplete) localStorage.setItem("quire:onboarding-complete", "true");
          setShowOnboarding(!onboardingComplete);
        }
      } catch {
        localStorage.removeItem("quire:default-project-settings");
        if (!cancelled) setShowOnboarding(localStorage.getItem("quire:onboarding-complete") !== "true");
      } finally {
        if (!cancelled) setOnboardingReady(true);
      }

    };

    void initializeLaunch();
    return () => { cancelled = true; };
  }, []);

  const requestProject = async (input: { name: string; template: OnboardingTemplate } & OnboardingPreferences) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const data = await res.json();
      return typeof data.id === "string" ? data.id : null;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    const projectId = await requestProject({ name: newProjectName, template: newProjectTemplate, ...projectDefaults });
    if (projectId) router.push(`/project/${projectId}`);
  };

  const handleOnboardingComplete = (preferences?: OnboardingPreferences) => {
    if (preferences) setProjectDefaults(preferences);
    const savedTheme = localStorage.getItem("quire:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextAppearance = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
    setAppearance(nextAppearance);
    setTheme(nextAppearance === "dark" || (nextAppearance === "system" && prefersDark) ? "dark" : "light");
    setShowOnboarding(false);
  };

  const handleOnboardingCreate = async (input: { name: string; template: OnboardingTemplate } & OnboardingPreferences) => {
    return requestProject(input);
  };

  const handleOnboardingProjectCreated = (projectId: string, preferences: OnboardingPreferences) => {
    handleOnboardingComplete(preferences);
    router.push(`/project/${projectId}`);
  };

  const handleOnboardingOpenExisting = (preferences: OnboardingPreferences) => {
    handleOnboardingComplete(preferences);
    setNewProjectName("");
    setImportFile(null);
    setIsImporting(true);
  };

  const selectNewProjectTemplate = (template: OnboardingTemplate) => {
    const nextTemplate = projectTemplates.find((item) => item.id === template);
    setNewProjectTemplate(template);
    if (!newProjectName.trim() || newProjectName.startsWith("Untitled ")) {
      setNewProjectName(template === "blank" ? "Untitled Document" : `Untitled ${nextTemplate?.title || "Document"}`);
    }
  };

  const handleImport = async () => {
    if (!newProjectName.trim() || !importFile) return;
    const formData = new FormData();
    formData.append("name", newProjectName);
    formData.append("file", importFile);
    
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/project/${data.id}`);
      }
    } catch (e) {
      console.error("Import failed", e);
    }
  };

  const requestDeleteProject = (event: React.MouseEvent<HTMLButtonElement>, project: ProjectSummary) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectPendingDeletion(project);
  };

  const handleDeleteProject = async () => {
    const project = projectPendingDeletion;
    if (!project) return;

    try {
      setProjectActionError("");
      const desktop = (window as Window & {
        quireDesktop?: { trashProject?: (input: { projectId: string }) => Promise<{ trashed: boolean }> };
      }).quireDesktop;

      if (desktop?.trashProject) {
        await desktop.trashProject({ projectId: project.id });
      } else {
        const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to delete project.");
      }

      setProjects((current) => current.filter((candidate) => candidate.id !== project.id));
      setProjectPendingDeletion(null);
    } catch (error) {
      setProjectActionError(error instanceof Error ? error.message : "Unable to delete project.");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyThemeWithFade(nextTheme);
    localStorage.setItem("quire:theme", nextTheme);
    const desktop = (window as Window & {
      quireDesktop?: { setWindowAppearance?: (appearance: "light" | "dark") => Promise<void> };
    }).quireDesktop;
    void desktop?.setWindowAppearance?.(nextTheme);
    setAppearance(nextTheme);
    setTheme(nextTheme);
  };

  const changeAppearance = (nextAppearance: "light" | "dark" | "system") => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = nextAppearance === "dark" || (nextAppearance === "system" && prefersDark) ? "dark" : "light";
    if (nextAppearance === "system") localStorage.removeItem("quire:theme");
    else localStorage.setItem("quire:theme", nextAppearance);
    applyThemeWithFade(nextTheme);
    const desktop = (window as Window & {
      quireDesktop?: { setWindowAppearance?: (appearance: "light" | "dark") => Promise<void> };
    }).quireDesktop;
    void desktop?.setWindowAppearance?.(nextTheme);
    setAppearance(nextAppearance);
    setTheme(nextTheme);
  };

  const openExternalUrl = async (url: string) => {
    const desktop = (window as Window & {
      quireDesktop?: { openExternalUrl?: (input: { url: string }) => Promise<void> };
    }).quireDesktop;

    if (desktop?.openExternalUrl) {
      await desktop.openExternalUrl({ url });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openWebsite = () => openExternalUrl(QUIRE_WEBSITE_URL);

  const openPrivacyPolicy = async () => {
    await openExternalUrl(QUIRE_PRIVACY_POLICY_URL);
    setShowPrivacy(false);
  };

  if (!onboardingReady) {
    return <div className="min-h-screen bg-[var(--quire-bg)]" />;
  }

  return (
    <div className="quire-dashboard relative min-h-screen overflow-hidden bg-[var(--quire-bg)] px-4 py-5 text-[var(--quire-text)] sm:px-8 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(255,0,0,0.07),transparent_56%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,50,42,0.12),transparent_56%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="quire-dashboard__header flex items-center justify-between border-b border-[var(--quire-border)] pb-5 sm:pb-6">
          <div className="flex items-center gap-3">
            <QuireWordmark className="w-[7.5rem] h-auto" />
            <span className="hidden rounded-full border border-[var(--quire-border)] bg-[var(--quire-surface)] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[var(--quire-muted)] sm:inline-flex">LOCAL WORKSPACE</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void openWebsite()} className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] sm:inline-flex">Website <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></button>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"
              aria-label="Read Quire's local-only privacy summary"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAppSettings(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"
              aria-label="Open app settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--quire-border)] bg-[var(--quire-surface)] text-[var(--quire-muted)] shadow-sm transition-all hover:-translate-y-px hover:text-[var(--quire-text)]"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <main className="pb-10 pt-14 sm:pt-20">
          <section className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] text-[var(--quire-red)]">
              <Sparkles className="h-3.5 w-3.5" />
              YOUR DESK
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">A good place to begin.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--quire-muted)] sm:text-base">Create a new LaTeX project, bring in work you already have, or pick up exactly where you left off.</p>
          </section>

          {compilerStatus?.platform === "win32" && !compilerStatus.compilerAvailable ? (
            <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-5 shadow-[0_12px_30px_rgba(20,20,20,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--quire-red-soft)] text-[var(--quire-red)]"><FileText className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold tracking-[-0.02em]">Set up local PDF compilation</p>
                  <p className="mt-1 max-w-xl text-sm leading-5 text-[var(--quire-muted)]">Quire is ready to edit. Install MiKTeX, or make TeX Live&apos;s <span className="font-mono text-[0.9em]">pdfLaTeX</span> available on this PC, to compile PDFs locally.</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => void refreshCompilerStatus()} disabled={isCheckingCompiler} className="rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--quire-text)] transition-colors hover:bg-[var(--quire-hover)] disabled:cursor-wait disabled:opacity-60">{isCheckingCompiler ? "Checking…" : "Check again"}</button>
                <button type="button" onClick={() => void openExternalUrl(compilerStatus.installerUrl || "https://miktex.org/download")} className="rounded-xl bg-[var(--quire-text)] px-4 py-2.5 text-sm font-semibold text-[var(--quire-surface)] transition-opacity hover:opacity-85">Get MiKTeX</button>
              </div>
            </section>
          ) : null}

          <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button 
              onClick={() => {
                setNewProjectTemplate("article");
                setNewProjectName("");
                setIsCreating(true);
              }}
              className="group relative min-h-56 overflow-hidden rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-7 text-left shadow-[0_12px_30px_rgba(20,20,20,0.04)] transition-all hover:-translate-y-1 hover:border-[var(--quire-red)] hover:shadow-[0_20px_44px_rgba(255,0,0,0.1)]"
            >
              <span className="absolute -right-6 -top-9 text-[11rem] font-semibold leading-none tracking-[-0.12em] text-[var(--quire-red)] opacity-[0.055] transition-transform duration-300 group-hover:scale-110">+</span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--quire-red)] text-white shadow-[0_8px_18px_rgba(255,0,0,0.22)]"><Plus className="h-5 w-5" /></span>
              <div className="relative mt-12">
                <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-red)]">START FRESH</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">New project</h2>
                <p className="mt-2 max-w-xs text-sm leading-5 text-[var(--quire-muted)]">Start with a clean article and make it yours.</p>
              </div>
              <span className="absolute bottom-7 right-7 grid h-8 w-8 place-items-center rounded-full border border-[var(--quire-border)] text-[var(--quire-muted)] transition-all group-hover:border-[var(--quire-red)] group-hover:bg-[var(--quire-red)] group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
            </button>

            <button 
              onClick={() => {
                setNewProjectName("");
                setImportFile(null);
                setIsImporting(true);
              }}
              className="group relative min-h-56 overflow-hidden rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-7 text-left shadow-[0_12px_30px_rgba(20,20,20,0.04)] transition-all hover:-translate-y-1 hover:border-[var(--quire-text)] hover:shadow-[0_20px_44px_rgba(20,20,20,0.08)]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] text-[var(--quire-text)]"><FileArchive className="h-5 w-5" /></span>
              <div className="relative mt-12">
                <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--quire-muted)]">BRING YOUR WORK</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Import project</h2>
                <p className="mt-2 max-w-xs text-sm leading-5 text-[var(--quire-muted)]">Open an existing ZIP archive without changing how it is organized.</p>
              </div>
              <span className="absolute bottom-7 right-7 grid h-8 w-8 place-items-center rounded-full border border-[var(--quire-border)] text-[var(--quire-muted)] transition-all group-hover:bg-[var(--quire-text)] group-hover:text-[var(--quire-surface)]"><ArrowUpRight className="h-4 w-4" /></span>
            </button>
          </section>

          <section className="mt-14">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold tracking-[0.13em] text-[var(--quire-muted)]">CONTINUE WRITING</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Recent projects</h2>
              </div>
              {!loading && projects.length > 0 ? <span className="mb-1 text-xs text-[var(--quire-muted)]">{projects.length} {projects.length === 1 ? "project" : "projects"}</span> : null}
            </div>
            {projectActionError && <p className="mb-3 text-sm text-[var(--quire-red)]">{projectActionError}</p>}
            <div className="divide-y divide-[var(--quire-border)] overflow-hidden rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] shadow-[0_12px_30px_rgba(20,20,20,0.04)]">
              {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-[var(--quire-muted)]" /></div>
              ) : projects.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="mx-auto h-6 w-6 text-[var(--quire-muted)]" />
                  <p className="mt-3 text-sm text-[var(--quire-muted)]">No projects yet. Your first document can start here.</p>
                </div>
              ) : (
                projects.map(p => (
                  <div key={p.id} className="group flex items-center gap-1 px-2 transition-colors hover:bg-[var(--quire-surface-secondary)] sm:px-3">
                    <Link
                      href={`/project/${p.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4 px-3 py-5 sm:px-3"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] text-[var(--quire-red)]"><FolderOpen className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold tracking-[-0.02em]">{p.name}</h3>
                        <p className="mt-1 truncate text-xs text-[var(--quire-muted)]">Local project · Last edited {new Date(p.lastModified).toLocaleDateString()}</p>
                      </div>
                      <span className="hidden rounded-md bg-[var(--quire-surface-secondary)] px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-[var(--quire-muted)] sm:inline-flex">LATEX</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--quire-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--quire-text)]" />
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => requestDeleteProject(event, p)}
                      aria-label={`Move ${p.name} to the Trash`}
                      title="Move project to Trash"
                      className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--quire-muted)] opacity-70 transition-all hover:bg-[var(--quire-red-soft)] hover:text-[var(--quire-red)] hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-10 grid gap-3 border-t border-[var(--quire-border)] pt-6 text-xs text-[var(--quire-muted)] sm:grid-cols-3">
            <p><span className="mr-2 text-[var(--quire-red)]">01</span>Your files stay on your machine.</p>
            <p><span className="mr-2 text-[var(--quire-red)]">02</span>Compile with the tools you already use.</p>
            <p><span className="mr-2 text-[var(--quire-red)]">03</span>Keep every project in plain files.</p>
          </section>
        </main>
      </div>

      <Dialog.Root open={showPrivacy} onOpenChange={setShowPrivacy}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(43rem,calc(100vh-2rem))] w-[min(92vw,38rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] text-[var(--quire-red)]"><ShieldCheck className="h-3.5 w-3.5" /> LOCAL-ONLY BY DESIGN</div>
                <Dialog.Title className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-[var(--quire-text)]">Your writing stays on your computer.</Dialog.Title>
              </div>
              <Dialog.Close className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]">Close</Dialog.Close>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--quire-text-secondary)]">Quire&apos;s writing, compiling, and PDF preview workflow runs on this device. It has no account system, cloud sync, telemetry pipeline, remote compiler, or background upload of your project content. Optional Quire Draft only connects when you add your own key and deliberately send selected text or a writing brief.</p>
            <div className="mt-6 grid gap-3">
              <div className="flex gap-3 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
                <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-[var(--quire-red)]" />
                <p className="text-sm leading-5 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">Files remain yours.</strong> Documents, assets, project settings, and generated PDFs are saved in the workspace folder you choose. You can inspect, copy, back up, or delete them in Finder or File Explorer.</p>
              </div>
              <div className="flex gap-3 rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] p-4">
                <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-[var(--quire-red)]" />
                <p className="text-sm leading-5 text-[var(--quire-text-secondary)]"><strong className="text-[var(--quire-text)]">No project cloud connection.</strong> Quire uses a local service on your computer to power the interface. Optional Quire Draft sends only selected text or a writing brief directly to your chosen provider when you request it.</p>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-[var(--quire-muted)]">This is the in-app privacy summary. Read the full policy for the privacy contact and complete local-first data practices.</p>
            <button type="button" onClick={() => void openPrivacyPolicy()} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--quire-red)] hover:underline">Read the full privacy policy <ArrowUpRight className="h-4 w-4" /></button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AppSettingsModal
        open={showAppSettings}
        onOpenChange={setShowAppSettings}
        appearance={appearance}
        onAppearanceChange={changeAppearance}
      />

      <ConfirmationDialog
        open={Boolean(projectPendingDeletion)}
        onOpenChange={(open) => { if (!open) setProjectPendingDeletion(null); }}
        title={projectPendingDeletion ? `Move “${projectPendingDeletion.name}” to the Trash?` : "Move project to the Trash?"}
        description="The project and all of its files will be moved to the Trash or Recycle Bin. You can restore them from there if needed."
        confirmLabel="Move to Trash"
        onConfirm={() => void handleDeleteProject()}
      />

      <Dialog.Root open={isCreating} onOpenChange={setIsCreating}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[min(44rem,calc(100vh-2rem))] w-[min(92vw,48rem)] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-6 shadow-xl sm:p-8">
            <Dialog.Title className="text-2xl font-semibold tracking-[-0.045em] text-[var(--quire-text)]">
              What are you making today?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">Choose a starting structure. Every project remains a normal folder of files on your computer.</Dialog.Description>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projectTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectNewProjectTemplate(template.id)}
                  className={`relative min-h-32 rounded-xl border p-4 text-left transition-all ${newProjectTemplate === template.id ? "border-[var(--quire-red)] bg-[var(--quire-red-soft)] shadow-[0_0_0_2px_rgba(255,0,0,0.08)]" : "border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--quire-text)_24%,transparent)]"}`}
                  aria-pressed={newProjectTemplate === template.id}
                >
                  <span className="text-[10px] font-bold tracking-[0.12em] text-[var(--quire-red)]">{template.eyebrow}</span>
                  <strong className="mt-2 block text-lg tracking-[-0.035em] text-[var(--quire-text)]">{template.title}</strong>
                  <span className="mt-1 block max-w-xs text-xs leading-5 text-[var(--quire-muted)]">{template.description}</span>
                  {newProjectTemplate === template.id ? <span className="absolute bottom-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--quire-red)] text-xs font-bold text-white">✓</span> : null}
                </button>
              ))}
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Give it a name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-[var(--quire-bg)] border border-[var(--quire-border)] rounded-md px-3 py-2 outline-none focus:border-[var(--quire-text)]"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="My Research Paper"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded text-sm hover:bg-[var(--quire-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-[var(--quire-text)] text-[var(--quire-surface)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Create
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={isImporting} onOpenChange={setIsImporting}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[var(--quire-surface)] border border-[var(--quire-border)] w-[90vw] max-w-md rounded-xl shadow-xl z-50 p-6">
            <Dialog.Title className="text-lg font-semibold text-[var(--quire-text)] mb-4">
              Import ZIP Archive
            </Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-[var(--quire-bg)] border border-[var(--quire-border)] rounded-md px-3 py-2 outline-none focus:border-[var(--quire-text)]"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="My Imported Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP File</label>
                <label className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-[var(--quire-bg)] border-2 border-[var(--quire-border)] border-dashed rounded-md appearance-none cursor-pointer hover:border-[var(--quire-text)] focus:outline-none overflow-hidden">
                    <span className="flex flex-col items-center space-y-2 max-w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[var(--quire-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="font-medium text-[var(--quire-text)] text-center w-full truncate px-2">
                            {importFile ? importFile.name : "Drop ZIP file here, or browse"}
                        </span>
                    </span>
                    <input type="file" accept=".zip" name="file_upload" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setIsImporting(false)}
                  className="px-4 py-2 rounded text-sm hover:bg-[var(--quire-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImport}
                  disabled={!newProjectName.trim() || !importFile}
                  className="px-4 py-2 bg-[var(--quire-text)] text-[var(--quire-surface)] rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Import
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {showOnboarding ? (
          <FirstLaunch
            onComplete={handleOnboardingComplete}
            onCreateProject={handleOnboardingCreate}
            onProjectCreated={handleOnboardingProjectCreated}
            onOpenExisting={handleOnboardingOpenExisting}
        />
      ) : null}
    </div>
  );
}
