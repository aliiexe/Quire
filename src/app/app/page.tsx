"use client";

import Link from "next/link";
import { FolderOpen, Plus, FileArchive, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-[var(--quire-bg)] flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-4xl">
        <header className="mb-12 flex items-center justify-between">
          <QuireWordmark className="w-32 h-auto" />
        </header>

        <main className="space-y-12">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setIsCreating(true)}
              className="flex flex-col items-center justify-center p-8 bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-xl hover:border-[var(--quire-text)] transition-colors group cursor-pointer text-left w-full"
            >
              <Plus className="w-8 h-8 mb-4 text-[var(--quire-muted)] group-hover:text-[var(--quire-text)] transition-colors" />
              <h2 className="text-lg font-medium">New project</h2>
              <p className="text-sm text-[var(--quire-muted)] mt-1 text-center">Start a blank document or use a template</p>
            </button>

            <button 
              onClick={() => {
                setNewProjectName("");
                setImportFile(null);
                setIsImporting(true);
              }}
              className="flex flex-col items-center justify-center p-8 bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-xl hover:border-[var(--quire-text)] transition-colors group cursor-pointer text-left w-full"
            >
              <FileArchive className="w-8 h-8 mb-4 text-[var(--quire-muted)] group-hover:text-[var(--quire-text)] transition-colors" />
              <h2 className="text-lg font-medium">Import project</h2>
              <p className="text-sm text-[var(--quire-muted)] mt-1 text-center">Upload a ZIP archive of an existing project</p>
            </button>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4 text-[var(--quire-text)]">Recent projects</h2>
            <div className="bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-xl divide-y divide-[var(--quire-border)] overflow-hidden">
              {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--quire-muted)]" /></div>
              ) : projects.length === 0 ? (
                <div className="p-8 text-center text-[var(--quire-muted)] text-sm">
                  No projects yet. Create one to get started.
                </div>
              ) : (
                projects.map(p => (
                  <Link 
                    key={p.id} 
                    href={`/project/${p.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-[var(--quire-bg)] transition-colors"
                  >
                    <FolderOpen className="w-5 h-5 text-[var(--quire-muted)]" />
                    <div className="flex-1">
                      <h3 className="font-medium">{p.name}</h3>
                      <p className="text-xs text-[var(--quire-muted)] mt-0.5">Last updated {new Date(p.lastModified).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
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
