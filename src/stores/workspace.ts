import { create } from "zustand";
import { ProjectNode, Project } from "@/lib/projects/storage";

import { LatexDiagnostic } from "@/lib/compiler/compiler";

interface WorkspaceState {
  project: Project | null;
  tree: ProjectNode[];
  activeFile: string | null;
  openFiles: string[];
  fileContents: Record<string, string>;
  isDirty: Record<string, boolean>;
  expandedFolders: Record<string, boolean>;
  isSaving: boolean;
  isCompiling: boolean;
  pdfRevision: number;
  diagnostics: LatexDiagnostic[];
  
  setProject: (project: Project) => void;
  setTree: (tree: ProjectNode[]) => void;
  setActiveFile: (path: string) => void;
  toggleFolder: (path: string) => void;
  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  forgetPath: (path: string) => void;
  movePath: (from: string, to: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setSaving: (saving: boolean) => void;
  markSaved: (path: string) => void;
  setCompiling: (compiling: boolean) => void;
  setDiagnostics: (diagnostics: LatexDiagnostic[]) => void;
  incrementPdfRevision: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  project: null,
  tree: [],
  activeFile: null,
  openFiles: [],
  fileContents: {},
  isDirty: {},
  expandedFolders: {},
  isSaving: false,
  isCompiling: false,
  pdfRevision: 0,
  diagnostics: [],

  setProject: (project) => {
    const stored = localStorage.getItem(`quire:project:${project.id}:tree-state`);
    const expandedFolders = stored ? JSON.parse(stored) : {};
    const isSameProject = get().project?.id === project.id;

    // File paths such as "main.tex" repeat across projects. Resetting the
    // document state on a project change prevents stale text, diagnostics, and
    // compile state from leaking into the newly opened document.
    set(isSameProject ? { project, expandedFolders } : {
      project,
      tree: [],
      activeFile: null,
      openFiles: [],
      fileContents: {},
      isDirty: {},
      expandedFolders,
      isSaving: false,
      isCompiling: false,
      pdfRevision: 0,
      diagnostics: [],
    });
  },
  
  setTree: (tree) => set({ tree }),
  
  toggleFolder: (path) => set((state) => {
    if (!state.project) return state;
    const next = { ...state.expandedFolders, [path]: !state.expandedFolders[path] };
    localStorage.setItem(`quire:project:${state.project.id}:tree-state`, JSON.stringify(next));
    return { expandedFolders: next };
  }),

  setActiveFile: (path) => set((state) => {
    if (!state.openFiles.includes(path)) {
      return state;
    }
    return { activeFile: path };
  }),
  
  openFile: (path, content) => set((state) => {
    const isOpen = state.openFiles.includes(path);
    return {
      openFiles: isOpen ? state.openFiles : [...state.openFiles, path],
      activeFile: path,
      fileContents: {
        ...state.fileContents,
        [path]: state.fileContents[path] ?? content
      }
    };
  }),
  
  closeFile: (path) => set((state) => {
    const newOpenFiles = state.openFiles.filter(p => p !== path);
    return {
      openFiles: newOpenFiles,
      activeFile: state.activeFile === path 
        ? (newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null) 
        : state.activeFile
    };
  }),

  forgetPath: (path) => set((state) => {
    const matchesPath = (candidate: string) => candidate === path || candidate.startsWith(`${path}/`);
    const openFiles = state.openFiles.filter((candidate) => !matchesPath(candidate));
    const fileContents = Object.fromEntries(Object.entries(state.fileContents).filter(([candidate]) => !matchesPath(candidate)));
    const isDirty = Object.fromEntries(Object.entries(state.isDirty).filter(([candidate]) => !matchesPath(candidate)));
    const activeFile = state.activeFile && matchesPath(state.activeFile)
      ? (openFiles[openFiles.length - 1] ?? null)
      : state.activeFile;

    return { openFiles, fileContents, isDirty, activeFile };
  }),

  movePath: (from, to) => set((state) => {
    const move = (candidate: string) => candidate === from
      ? to
      : candidate.startsWith(`${from}/`)
        ? `${to}${candidate.slice(from.length)}`
        : candidate;
    const remapRecord = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).map(([path, value]) => [move(path), value]));

    return {
      openFiles: state.openFiles.map(move),
      fileContents: remapRecord(state.fileContents),
      isDirty: remapRecord(state.isDirty),
      expandedFolders: remapRecord(state.expandedFolders),
      activeFile: state.activeFile ? move(state.activeFile) : null,
    };
  }),
  
  updateFileContent: (path, content) => set((state) => ({
    fileContents: {
      ...state.fileContents,
      [path]: content
    },
    isDirty: {
      ...state.isDirty,
      [path]: true
    }
  })),

  setSaving: (saving) => set({ isSaving: saving }),
  
  markSaved: (path) => set((state) => ({
    isDirty: {
      ...state.isDirty,
      [path]: false
    }
  })),

  setCompiling: (compiling) => set({ isCompiling: compiling }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  incrementPdfRevision: () => set((state) => ({ pdfRevision: state.pdfRevision + 1 }))
}));
