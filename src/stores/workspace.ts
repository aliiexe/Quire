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
    // Try to restore expandedFolders state for this project
    const stored = localStorage.getItem(`quire:project:${project.id}:tree-state`);
    const expandedFolders = stored ? JSON.parse(stored) : {};
    set({ project, expandedFolders });
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
