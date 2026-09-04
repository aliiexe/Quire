"use client";

import { useState, useEffect, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, PanelImperativeHandle } from "react-resizable-panels";
import { useRef } from "react";
import { Play, Settings, X, Sun, Moon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { QuireMark } from "@/components/brand/logo";
import { useWorkspaceStore } from "@/stores/workspace";
import { ProjectTree } from "@/components/explorer/ProjectTree";
import { QuickOpen } from "@/components/explorer/QuickOpen";
import { Editor } from "@/components/editor/Editor";
import { PDFViewer } from "@/components/preview/PDFViewer";
import { SettingsModal } from "@/components/workspace/SettingsModal";
import { useParams } from "next/navigation";
import type { LatexDiagnostic } from "@/lib/compiler/compiler";
import type { Project } from "@/lib/projects/storage";

const EDITABLE_TEXT_EXTENSIONS = new Set([".tex", ".txt", ".bib", ".sty", ".cls", ".md", ".json", ".yaml", ".yml"]);

function isEditableTextFile(path: string) {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return EDITABLE_TEXT_EXTENSIONS.has(extension);
}

export default function Workspace() {
  const params = useParams() as { projectId: string };
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const explorerPanelRef = useRef<PanelImperativeHandle>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const compileInFlightRef = useRef(false);
  const autoCompileWasEnabledRef = useRef(false);
  
  useEffect(() => {
    const stored = localStorage.getItem('quire:sidebar-collapsed');
    if (stored === 'true') {
      const frame = requestAnimationFrame(() => {
        setIsExplorerCollapsed(true);
        explorerPanelRef.current?.collapse();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const toggleExplorer = () => {
    if (explorerPanelRef.current) {
      if (isExplorerCollapsed) {
        explorerPanelRef.current.expand();
        setIsExplorerCollapsed(false);
        localStorage.setItem('quire:sidebar-collapsed', 'false');
      } else {
        explorerPanelRef.current.collapse();
        setIsExplorerCollapsed(true);
        localStorage.setItem('quire:sidebar-collapsed', 'true');
      }
    }
  };
  const { 
    project, tree, activeFile, openFiles, fileContents, isDirty, isSaving, isCompiling, pdfRevision, diagnostics,
    setProject, setTree, setActiveFile, openFile, closeFile, updateFileContent, markSaved, setSaving, setCompiling, setDiagnostics, incrementPdfRevision
  } = useWorkspaceStore();

  // Load project
  useEffect(() => {
    fetch(`/api/projects/${params.projectId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProject(data);
      });
      
    fetch(`/api/projects/${params.projectId}/tree`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTree(data);
      });
  }, [params.projectId, setProject, setTree]);

  const saveDirtyFiles = useCallback(async (paths: string[]) => {
    const pathsToSave = paths.filter((path) => isDirty[path]);
    if (pathsToSave.length === 0) return true;

    setSaving(true);
    try {
      const saved = await Promise.all(pathsToSave.map(async (path) => {
        try {
          const response = await fetch(`/api/projects/${params.projectId}/files?path=${encodeURIComponent(path)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: fileContents[path] })
          });
          if (!response.ok) throw new Error("Save request failed");
          markSaved(path);
          return true;
        } catch (error) {
          console.error(`Failed to save ${path}`, error);
          return false;
        }
      }));
      return saved.every(Boolean);
    } finally {
      setSaving(false);
    }
  }, [fileContents, isDirty, markSaved, params.projectId, setSaving]);

  const compileProject = useCallback(async ({ flushDirty = true }: { flushDirty?: boolean } = {}) => {
    if (compileInFlightRef.current) return;
    compileInFlightRef.current = true;

    try {
      if (flushDirty) {
        const dirtyPaths = Object.keys(isDirty).filter((path) => isDirty[path]);
        const saved = await saveDirtyFiles(dirtyPaths);
        if (!saved) {
          setDiagnostics([{ severity: "error", message: "Unable to save all changes before compiling." }]);
          return;
        }
      }

      setCompiling(true);
      const response = await fetch(`/api/projects/${params.projectId}/compile`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setDiagnostics([{ severity: "error", message: data.error || "Compilation failed." }]);
        return;
      }

      setDiagnostics(data.diagnostics || []);
      if (data.success) incrementPdfRevision();
    } catch (error) {
      console.error("Failed to compile", error);
      setDiagnostics([{ severity: "error", message: "Compilation could not be completed." }]);
    } finally {
      setCompiling(false);
      compileInFlightRef.current = false;
    }
  }, [incrementPdfRevision, isDirty, params.projectId, saveDirtyFiles, setCompiling, setDiagnostics]);

  // Handle file selection
  const handleSelectFile = useCallback(async (path: string) => {
    if (!isEditableTextFile(path)) return;

    if (!openFiles.includes(path)) {
        const res = await fetch(`/api/projects/${params.projectId}/files?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error("Failed to load file");
        const data = await res.json();
        openFile(path, data.content || "");
    } else {
      setActiveFile(path);
    }

    if (project?.autoCompile) {
      void compileProject();
    }
  }, [compileProject, openFiles, params.projectId, openFile, project?.autoCompile, setActiveFile]);

  // Listen for Quick Open select
  useEffect(() => {
    const onQuickOpen = (event: Event) => {
      const { detail } = event as CustomEvent<string>;
      void handleSelectFile(detail);
    };
    window.addEventListener('quire-quick-open', onQuickOpen);
    return () => window.removeEventListener('quire-quick-open', onQuickOpen);
  }, [handleSelectFile]);

  const handleEditorChange = (value: string) => {
    if (activeFile) {
      updateFileContent(activeFile, value);
    }
  };

  const hasDirtyFiles = Object.values(isDirty).some(Boolean);

  const saveFile = useCallback(async (path: string) => {
    await saveDirtyFiles([path]);
  }, [saveDirtyFiles]);

  const updateProjectSettings = useCallback(async (updates: Partial<Project>) => {
    if (!project) return;

    const previousProject = project;
    setProject({ ...project, ...updates });
    try {
      const response = await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Project update request failed");
      setProject(await response.json());
    } catch (error) {
      console.error("Failed to update project settings", error);
      setProject(previousProject);
    }
  }, [params.projectId, project, setProject]);

  // Keyboard shortcut: Cmd/Ctrl + S, Cmd/Ctrl + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 's') {
          e.preventDefault();
          if (activeFile) saveFile(activeFile);
        } else if (e.key === 'p') {
          e.preventDefault();
          setIsQuickOpen(true);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          compileProject();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, compileProject, saveFile]);

  // Autosave & Auto-compile
  useEffect(() => {
    if (!project?.autoCompile) return;
    
    const dirtyPaths = Object.keys(isDirty).filter(p => isDirty[p]);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (dirtyPaths.length > 0) {
      saveTimeoutRef.current = setTimeout(async () => {
        saveTimeoutRef.current = null;
        const saved = await saveDirtyFiles(dirtyPaths);
        if (saved) void compileProject({ flushDirty: false });
      }, project.autoCompileDelayMs ?? 800);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [compileProject, fileContents, isDirty, project?.autoCompile, project?.autoCompileDelayMs, saveDirtyFiles]);

  useEffect(() => {
    const enabled = Boolean(project?.autoCompile);
    const wasEnabled = autoCompileWasEnabledRef.current;
    autoCompileWasEnabledRef.current = enabled;

    if (enabled && !wasEnabled && activeFile && isEditableTextFile(activeFile)) {
      void compileProject();
    }
  }, [activeFile, compileProject, project?.autoCompile]);
  
  return (
    <div className="h-screen flex flex-col bg-[var(--quire-bg)] text-[var(--quire-text)] overflow-hidden">
      <QuickOpen isOpen={isQuickOpen} onClose={() => setIsQuickOpen(false)} />
      {/* Top Application Bar */}
      <header className="h-14 border-b border-[var(--quire-border)] bg-[color-mix(in_srgb,var(--quire-surface)_92%,transparent)] backdrop-blur-xl flex items-center justify-between px-4 sm:px-5 shrink-0 transition-colors duration-200 ease-out shadow-[0_1px_0_rgba(20,20,20,.02)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link href="/app" className="w-7 h-7 rounded-[9px] bg-[var(--quire-red-soft)] flex items-center justify-center hover:scale-[1.03] transition-transform shrink-0">
            <QuireMark className="w-5 h-5" />
          </Link>
          <div className="h-5 w-px bg-[var(--quire-border)]"></div>
          <span className="font-semibold text-[13px] tracking-[-0.02em] truncate">{project?.name || "Loading..."}</span>
          <span className="text-[10px] text-[var(--quire-muted)] flex items-center gap-1.5 shrink-0">
            {isSaving ? "Saving..." : hasDirtyFiles ? (
              <><div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-red)]"></div>Unsaved</>
            ) : <><div className="w-1.5 h-1.5 rounded-full bg-[#86a883]"></div>Saved</>}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-[13px]">
          {/* Custom Auto-Compile Switch */}
          <label className="hidden md:flex items-center gap-2 cursor-pointer text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors duration-150 ease-out">
            <span className="text-[11px] font-semibold">Auto compile</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={project?.autoCompile || false} 
                onChange={(e) => void updateProjectSettings({ autoCompile: e.target.checked })}
              />
              <div className="w-8 h-[18px] bg-[var(--quire-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--quire-red)] shadow-inner"></div>
            </div>
          </label>
          
          {/* Recompile Button */}
          <button 
            className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold bg-[var(--quire-red)] text-white rounded-[9px] hover:brightness-95 transition-all duration-150 ease-out min-w-[96px] justify-center shadow-[0_5px_14px_rgba(255,0,0,.2)] disabled:opacity-60"
            onClick={() => void compileProject()}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <span className="flex items-center gap-1.5 opacity-80">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-surface)] animate-pulse"></div>
                Compiling
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-current" />
                Recompile
              </span>
            )}
          </button>

          <div className="hidden sm:block h-4 w-px bg-[var(--quire-border)] mx-1"></div>
          
          <button 
            aria-label="Toggle appearance"
            className="hidden sm:inline-flex p-2 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-all duration-150 ease-out rounded-[8px] hover:bg-[var(--quire-hover)]"
            onClick={() => {
              const root = document.documentElement;
              const current = root.getAttribute('data-theme');
              const next = current === 'dark' ? 'light' : 'dark';
              root.setAttribute('data-theme', next);
              localStorage.setItem('quire:theme', next);
            }}
          >
            <Sun className="w-4 h-4 hidden dark:block" />
            <Moon className="w-4 h-4 block dark:hidden" />
          </button>

          <button 
            aria-label="Workspace settings"
            className="inline-flex p-2 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-all duration-150 ease-out rounded-[8px] hover:bg-[var(--quire-hover)]"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsModal 
          project={project} 
          onClose={() => setShowSettings(false)} 
          onUpdate={updateProjectSettings}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup orientation="horizontal">
          {/* Project Explorer */}
          <Panel 
            panelRef={explorerPanelRef}
            defaultSize={19}
            minSize={15}
            collapsible 
            collapsedSize={0}
            onResize={(size) => {
              const collapsed = Number(size) === 0;
              if (collapsed !== isExplorerCollapsed) {
                setIsExplorerCollapsed(collapsed);
                localStorage.setItem('quire:sidebar-collapsed', collapsed.toString());
              }
            }}
            className="bg-[var(--quire-surface-secondary)] transition-[flex-basis] duration-200 ease-in-out"
          >
            <div className="h-full flex flex-col border-r border-[var(--quire-border)] min-w-[200px]">
              <div className="px-3.5 border-b border-[var(--quire-border)] text-[10px] font-semibold tracking-[.1em] uppercase text-[var(--quire-muted)] flex justify-between items-center h-10 group/explorerHeader">
                <span>Files</span>
                <button aria-label="Collapse file explorer" onClick={toggleExplorer} className="p-1.5 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded-[7px] text-[var(--quire-muted)] transition-all duration-150 ease-out opacity-0 group-hover/explorerHeader:opacity-100">
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2.5 overflow-auto">
                <ProjectTree 
                  nodes={tree} 
                  selectedPath={activeFile || ""} 
                  onSelect={handleSelectFile} 
                />
              </div>
            </div>
          </Panel>
          
          {/* Collapsed Rail Indicator */}
          {isExplorerCollapsed && (
            <div className="w-11 shrink-0 border-r border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] flex flex-col items-center py-2 transition-all duration-200">
               <button aria-label="Open file explorer" onClick={toggleExplorer} className="p-2 hover:bg-[var(--quire-surface)] hover:text-[var(--quire-text)] rounded-[8px] text-[var(--quire-muted)] transition-colors mt-0.5 shadow-sm">
                  <PanelLeftOpen className="w-4 h-4" />
               </button>
            </div>
          )}
          
          <PanelResizeHandle className="w-1 bg-transparent hover:bg-[var(--quire-red)]/35 transition-colors cursor-col-resize" />
          
          {/* Editor */}
          <Panel defaultSize={40} minSize={20}>
            <div className="h-full flex flex-col bg-[var(--quire-surface)] relative border-r border-[var(--quire-border)]">
             {/* Tabs */}
              <div className="flex border-b border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] overflow-x-auto shrink-0 scrollbar-hide h-10 px-1.5 transition-colors duration-150 ease-out">
                {openFiles.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-[var(--quire-muted)] flex items-center">No open files</div>
                ) : (
                  openFiles.map(file => (
                    <div 
                      key={file}
                      className={`flex items-center gap-2 px-3 h-full text-[11px] cursor-pointer min-w-0 transition-all duration-150 ease-out relative group rounded-t-[7px]
                        ${activeFile === file 
                          ? 'bg-[var(--quire-surface)] text-[var(--quire-text)] font-medium' 
                          : 'bg-transparent text-[var(--quire-muted)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text-secondary)]'
                        }`}
                      onClick={() => setActiveFile(file)}
                    >
                      <span className="truncate max-w-[120px]">{file.split('/').pop()}</span>
                      {isDirty[file] && <span className={`w-1.5 h-1.5 rounded-full ${activeFile === file ? 'bg-[var(--quire-red)]' : 'bg-[var(--quire-muted)]'} shrink-0`}></span>}
                      <X 
                        className={`w-3.5 h-3.5 rounded-sm shrink-0 transition-colors duration-150 ease-out p-0.5 box-content
                          ${activeFile === file ? 'text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)]' : 'text-transparent group-hover:text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)]'}`}
                        onClick={(e) => { e.stopPropagation(); closeFile(file); }}
                      />
                      {activeFile === file && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--quire-red)]" />}
                    </div>
                  ))
                )}
              </div> {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeFile ? (
                  <Editor 
                    value={fileContents[activeFile] || ""} 
                    onChange={handleEditorChange} 
                    diagnostics={diagnostics
                      .filter((diagnostic): diagnostic is LatexDiagnostic & { severity: "error" | "warning" } =>
                        (diagnostic.severity === "error" || diagnostic.severity === "warning") &&
                        ((diagnostic.file || "main.tex") === activeFile || (diagnostic.file || "main.tex").endsWith(activeFile))
                      )
                      .map((diagnostic) => ({
                        file: diagnostic.file || "main.tex",
                        line: diagnostic.line || 1,
                        message: diagnostic.message,
                        severity: diagnostic.severity,
                      }))}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-[var(--quire-muted)]">
                    Select a file to edit
                  </div>
                )}
              </div>
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-transparent hover:bg-[var(--quire-red)]/35 transition-colors cursor-col-resize" />
          
          {/* PDF Preview */}
          <Panel defaultSize={40} minSize={20}>
            <PDFViewer 
              url={pdfRevision > 0 ? `/api/projects/${params.projectId}/pdf?rev=${pdfRevision}` : null} 
              onDownload={() => window.open(`/api/projects/${params.projectId}/pdf`, '_blank')}
            />
          </Panel>
        </PanelGroup>
      </div>
      
      {/* Diagnostics / Status Bar */}
      <footer className="h-8 border-t border-[var(--quire-border)] bg-[var(--quire-surface)] shrink-0 flex items-center justify-between px-4 text-[10px] text-[var(--quire-muted)]">
        <div className="flex items-center gap-4">
          <span 
            className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--quire-text)] transition-colors"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${diagnostics.some(d => d.severity === 'error') ? 'bg-[var(--quire-red)]' : 'bg-[var(--quire-muted)]'}`}></span>
            {diagnostics.filter(d => d.severity === 'error').length} errors
          </span>
          <span 
            className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--quire-text)] transition-colors"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${diagnostics.some(d => d.severity === 'warning') ? 'bg-yellow-500' : 'bg-[var(--quire-muted)]'}`}></span>
            {diagnostics.filter(d => d.severity === 'warning').length} warnings
          </span>
        </div>
        <div>
          {diagnostics.length > 0 && (
            <button 
              className="hover:text-[var(--quire-text)] underline underline-offset-2"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            >
              {showDiagnostics ? 'Hide details' : 'View details'}
            </button>
          )}
        </div>
      </footer>
      
      {/* Diagnostics Drawer */}
      {showDiagnostics && (
        <div className="absolute bottom-8 left-0 right-0 h-64 bg-[var(--quire-surface)] border-t border-[var(--quire-border)] shadow-lg flex flex-col z-10">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--quire-border)]">
            <span className="font-medium text-sm">Diagnostics</span>
            <X className="w-4 h-4 cursor-pointer text-[var(--quire-muted)] hover:text-[var(--quire-text)]" onClick={() => setShowDiagnostics(false)} />
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm font-mono space-y-4">
            {diagnostics.length === 0 ? (
              <div className="text-[var(--quire-muted)] text-center mt-8">No diagnostics to show.</div>
            ) : (
              diagnostics.map((diag, i) => (
                <div 
                  key={i} 
                  className="flex gap-4 items-start cursor-pointer hover:bg-[var(--quire-hover)] p-2 rounded transition-colors"
                  onClick={async () => {
                    const targetFile = diag.file || "main.tex";
                    if (targetFile !== activeFile) {
                      await handleSelectFile(targetFile);
                    }
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('editor-goto-line', { detail: { line: diag.line } }));
                    }, 100);
                  }}
                >
                  <span className={`shrink-0 uppercase text-xs font-bold ${diag.severity === 'error' ? 'text-[var(--quire-red)]' : 'text-yellow-500'}`}>
                    {diag.severity}
                  </span>
                  <div>
                    <div className="font-semibold">{diag.file}:{diag.line}</div>
                    <div className="whitespace-pre-wrap mt-1 text-[var(--quire-muted)]">{diag.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
