"use client";

import Link from "next/link";
import { ArrowUpRight, FileArchive, FileText, FolderOpen, Loader2, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { QuireWordmark } from "@/components/brand/logo";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProjectSummary } from "@/lib/projects/storage";
import * as Dialog from "@radix-ui/react-dialog";

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();

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
    const savedTheme = localStorage.getItem("quire:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme === "dark" || (savedTheme !== "light" && prefersDark) ? "dark" : "light");
  }, []);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, template: "article" })
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/project/${data.id}`);
      }
    } catch (e) {
      console.error(e);
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

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("quire:theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--quire-bg)] px-4 py-5 text-[var(--quire-text)] sm:px-8 sm:py-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(255,0,0,0.07),transparent_56%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,50,42,0.12),transparent_56%)]" />
      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between border-b border-[var(--quire-border)] pb-5 sm:pb-6">
          <div className="flex items-center gap-3">
            <QuireWordmark className="w-[7.5rem] h-auto" />
            <span className="hidden rounded-full border border-[var(--quire-border)] bg-[var(--quire-surface)] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[var(--quire-muted)] sm:inline-flex">LOCAL WORKSPACE</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] sm:inline-flex">Website</Link>
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

          <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button 
              onClick={() => setIsCreating(true)}
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
                  <Link 
                    key={p.id} 
                    href={`/project/${p.id}`}
                    className="group flex items-center gap-4 px-5 py-5 transition-colors hover:bg-[var(--quire-surface-secondary)] sm:px-6"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] text-[var(--quire-red)]"><FolderOpen className="h-5 w-5" /></span>
                    <div className="flex-1">
                      <h3 className="font-semibold tracking-[-0.02em]">{p.name}</h3>
                      <p className="mt-1 text-xs text-[var(--quire-muted)]">Local project · Last edited {new Date(p.lastModified).toLocaleDateString()}</p>
                    </div>
                    <span className="hidden rounded-md bg-[var(--quire-surface-secondary)] px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-[var(--quire-muted)] sm:inline-flex">LATEX</span>
                    <ArrowUpRight className="h-4 w-4 text-[var(--quire-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--quire-text)]" />
                  </Link>
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

      <Dialog.Root open={isCreating} onOpenChange={setIsCreating}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[var(--quire-surface)] border border-[var(--quire-border)] w-[90vw] max-w-md rounded-xl shadow-xl z-50 p-6">
            <Dialog.Title className="text-lg font-semibold text-[var(--quire-text)] mb-4">
              Create New Project
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
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="My Research Paper"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
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
    </div>
  );
}
