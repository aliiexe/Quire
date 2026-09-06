"use client";

import { useState, useEffect, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, PanelImperativeHandle } from "react-resizable-panels";
import { useRef } from "react";
import { AlertTriangle, Check, Copy, FilePlus, FolderPlus, Play, Settings, X, Sun, Moon, PanelLeftClose, PanelLeftOpen, Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { QuireMark } from "@/components/brand/logo";
import { useWorkspaceStore } from "@/stores/workspace";
import { ProjectTree } from "@/components/explorer/ProjectTree";
import { QuickOpen } from "@/components/explorer/QuickOpen";
import { Editor } from "@/components/editor/Editor";
import { PDFViewer } from "@/components/preview/PDFViewer";
import { SettingsModal } from "@/components/workspace/SettingsModal";
import { useParams, useRouter } from "next/navigation";
import type { LatexDiagnostic } from "@/lib/compiler/compiler";
import type { Project, ProjectNode } from "@/lib/projects/storage";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { WritingAssistant, type DiagnosticFixRequest, type WritingSelection } from "@/components/ai/WritingAssistant";
import { applyThemeWithFade } from "@/lib/theme";

const EDITABLE_TEXT_EXTENSIONS = new Set([".tex", ".txt", ".bib", ".sty", ".cls", ".md", ".json", ".yaml", ".yml"]);
const IMAGE_ASSET_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"]);

function isEditableTextFile(path: string) {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return EDITABLE_TEXT_EXTENSIONS.has(extension);
}

function assetKind(path: string): "image" | "pdf" | null {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (extension === ".pdf") return "pdf";
  return IMAGE_ASSET_EXTENSIONS.has(extension) ? "image" : null;
}

type ProjectAsset = { path: string; kind: "image" | "pdf" };
type AssistantProposal = {
  id: string;
  filePath: string;
  originalContent: string;
  previewContent: string;
  previewRange?: { from: number; to: number };
  selection?: WritingSelection;
  label: string;
  compileStatus: "compiling" | "ready" | "failed";
  compileDiagnostics: LatexDiagnostic[];
};

type DesktopMenuCommand =
  | { type: "new-file" | "new-folder" | "save-all" | "recompile" | "export-pdf" | "toggle-explorer" }
  | { type: "set-auto-save" | "set-auto-compile"; enabled: boolean };

type DesktopBridge = {
  setMenuState?: (state: { autoSave: boolean; autoCompile: boolean }) => void;
  onMenuCommand?: (listener: (command: DesktopMenuCommand) => void) => () => void;
  savePdf?: (input: { projectId: string; filename: string }) => Promise<{ cancelled: boolean; path?: string }>;
  trashProjectItem?: (input: { projectId: string; path: string }) => Promise<{ trashed: boolean }>;
  setWindowAppearance?: (appearance: "light" | "dark") => Promise<void>;
};

function desktopBridge() {
  return (window as Window & { quireDesktop?: DesktopBridge }).quireDesktop;
}

export default function Workspace() {
  const params = useParams() as { projectId: string };
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [newFolderError, setNewFolderError] = useState("");
  const [previewedAsset, setPreviewedAsset] = useState<ProjectAsset | null>(null);
  const [compileError, setCompileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isFileDropActive, setIsFileDropActive] = useState(false);
  const [assistantSelection, setAssistantSelection] = useState<WritingSelection | null>(null);
  const [diagnosticFixRequest, setDiagnosticFixRequest] = useState<DiagnosticFixRequest | null>(null);
  const [copiedDiagnosticKey, setCopiedDiagnosticKey] = useState<string | null>(null);
  const [assistantProposal, setAssistantProposal] = useState<AssistantProposal | null>(null);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [nodePendingDeletion, setNodePendingDeletion] = useState<ProjectNode | null>(null);
  const [unsavedAction, setUnsavedAction] = useState<{ type: "dashboard" } | { type: "close-file"; path: string } | null>(null);
  const explorerPanelRef = useRef<PanelImperativeHandle>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const workspaceDragDepthRef = useRef(0);
  const compileInFlightRef = useRef(false);
  const autoCompileWasEnabledRef = useRef(false);
  const automaticallyOpenedProjectRef = useRef<string | null>(null);
  const router = useRouter();
  
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

  const toggleExplorer = useCallback(() => {
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
  }, [isExplorerCollapsed]);
  const { 
    project, tree, activeFile, openFiles, fileContents, isDirty, isSaving, isCompiling, pdfRevision, diagnostics,
    setProject, setTree, setActiveFile, openFile, closeFile, forgetPath, movePath, updateFileContent, markSaved, setSaving, setCompiling, setDiagnostics, incrementPdfRevision
  } = useWorkspaceStore();

  // Load project
  useEffect(() => {
    let cancelled = false;

    const loadProject = async () => {
      try {
        const projectResponse = await fetch(`/api/projects/${params.projectId}`);
        const nextProject = await projectResponse.json();
        if (cancelled || nextProject.error) return;

        setProject(nextProject);

        const treeResponse = await fetch(`/api/projects/${params.projectId}/tree`);
        const nextTree = await treeResponse.json();
        if (!cancelled && !nextTree.error) setTree(nextTree);
      } catch (error) {
        console.error("Failed to load project", error);
      }
    };

    void loadProject();
    return () => { cancelled = true; };
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
      setCompileError("");
      if (flushDirty) {
        const dirtyPaths = Object.keys(isDirty).filter((path) => isDirty[path]);
        const saved = await saveDirtyFiles(dirtyPaths);
        if (!saved) {
          const message = "Unable to save all changes before compiling.";
          setDiagnostics([{ severity: "error", message }]);
          setCompileError(message);
          return;
        }
      }

      setCompiling(true);
      const response = await fetch(`/api/projects/${params.projectId}/compile`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error || "Compilation failed.";
        setDiagnostics([{ severity: "error", message }]);
        setCompileError(message);
        return;
      }

      setDiagnostics(data.diagnostics || []);
      if (data.success) {
        incrementPdfRevision();
      } else {
        const message = (data.diagnostics || []).find((diagnostic: LatexDiagnostic) => diagnostic.severity === "error")?.message || "Compilation failed without a diagnostic.";
        setCompileError(message);
      }
    } catch (error) {
      console.error("Failed to compile", error);
      const message = "Compilation could not be completed.";
      setDiagnostics([{ severity: "error", message }]);
      setCompileError(message);
    } finally {
      setCompiling(false);
      compileInFlightRef.current = false;
    }
  }, [incrementPdfRevision, isDirty, params.projectId, saveDirtyFiles, setCompiling, setDiagnostics]);

  const refreshTree = useCallback(async () => {
    const response = await fetch(`/api/projects/${params.projectId}/tree`);
    const nextTree = await response.json();
    if (!response.ok || nextTree.error) throw new Error(nextTree.error || "Unable to refresh the file list");
    setTree(nextTree);
  }, [params.projectId, setTree]);

  // Handle file selection
  const handleSelectFile = useCallback(async (path: string) => {
    const nextAssetKind = assetKind(path);
    if (nextAssetKind) {
      setPreviewedAsset({ path, kind: nextAssetKind });
      return;
    }
    if (!isEditableTextFile(path)) return;

    setPreviewedAsset(null);

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

  useEffect(() => {
    if (!project?.id || !project.rootFile || automaticallyOpenedProjectRef.current === project.id) return;

    automaticallyOpenedProjectRef.current = project.id;
    void handleSelectFile(project.rootFile).catch((error) => {
      console.error("Failed to open the main document", error);
    });
  }, [handleSelectFile, project?.id, project?.rootFile]);

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
    // A Draft result is only a visual proposal until the writer explicitly
    // accepts it from the review bar below the editor.
    if (assistantProposal) return;
    if (activeFile) {
      updateFileContent(activeFile, value);
    }
  };

  const handleAssistantSelection = useCallback((selection: WritingSelection) => {
    setAssistantSelection(selection.text ? selection : null);
  }, []);

  const copyDiagnostic = useCallback(async (diagnostic: LatexDiagnostic, key: string) => {
    const location = [diagnostic.file || activeFile || "source", diagnostic.line ? `line ${diagnostic.line}` : ""]
      .filter(Boolean)
      .join(" · ");
    const contents = `${diagnostic.severity === "error" ? "Error" : "Warning"} — ${location}\n${diagnostic.message}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(contents);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = contents;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy was not available");
      }
      setCopiedDiagnosticKey(key);
      window.setTimeout(() => setCopiedDiagnosticKey((current) => current === key ? null : current), 1800);
    } catch {
      setDiagnostics([{ severity: "error", message: "Quire could not copy this diagnostic. Select the text in the details panel and copy it manually." }]);
    }
  }, [activeFile, setDiagnostics]);

  const requestDiagnosticFix = useCallback(async (diagnostic: LatexDiagnostic) => {
    const targetFile = diagnostic.file || activeFile || project?.rootFile;
    if (!targetFile) {
      setDiagnostics([{ severity: "error", message: "Open the file with this error before asking Quire Draft to repair it." }]);
      return;
    }

    try {
      let content = activeFile === targetFile ? fileContents[targetFile] || "" : "";
      if (!content) {
        const response = await fetch(`/api/projects/${params.projectId}/files?path=${encodeURIComponent(targetFile)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Quire could not read the source file for this diagnostic.");
        content = typeof data.content === "string" ? data.content : "";
      }

      const lineNumber = Math.max(1, Math.min(diagnostic.line || 1, content.split(/\r?\n/).length));
      let from = 0;
      for (let index = 1; index < lineNumber; index += 1) {
        const lineBreak = content.indexOf("\n", from);
        if (lineBreak === -1) break;
        from = lineBreak + 1;
      }
      const nextLineBreak = content.indexOf("\n", from);
      const to = nextLineBreak === -1 ? content.length : nextLineBreak;
      const selectedText = content.slice(from, to);
      if (!selectedText.trim()) throw new Error("This diagnostic does not point to a source line Quire can repair.");

      if (targetFile !== activeFile) await handleSelectFile(targetFile);
      // Selecting a different editor tab clears stale selections. Wait one
      // frame so the new editor is mounted before opening Quire Draft.
      requestAnimationFrame(() => {
        setAssistantSelection({ from, to, text: selectedText });
        setDiagnosticFixRequest({
          id: crypto.randomUUID(),
          instruction: `Fix the LaTeX compiler error on ${targetFile}, line ${lineNumber}. Return only the replacement for the selected source line(s), with no explanation or Markdown fences. Preserve the document's language, formatting, and all unrelated LaTeX syntax. Compiler message: ${diagnostic.message.replace(/\s+/g, " ").trim()}`,
        });
        setShowDiagnostics(false);
      });
    } catch (error) {
      setDiagnostics([{ severity: "error", message: error instanceof Error ? error.message : "Quire could not prepare a repair suggestion." }]);
    }
  }, [activeFile, fileContents, handleSelectFile, params.projectId, project?.rootFile, setDiagnostics]);

  const discardDraftPreview = useCallback((token: string) => {
    void fetch(`/api/projects/${params.projectId}/draft-preview?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    }).catch(() => {
      // This is a best-effort cleanup for an isolated temporary workspace.
      // It never affects the writer's actual project.
    });
  }, [params.projectId]);

  const beginAssistantProposal = useCallback((proposal: Omit<AssistantProposal, "id" | "compileStatus" | "compileDiagnostics">) => {
    const token = crypto.randomUUID();
    setAssistantProposal({
      ...proposal,
      id: token,
      compileStatus: "compiling",
      compileDiagnostics: [],
    });

    void fetch(`/api/projects/${params.projectId}/draft-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, filePath: proposal.filePath, content: proposal.previewContent }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Quire Draft could not compile this proposal.");
        setAssistantProposal((current) => current?.id === token ? {
          ...current,
          compileStatus: data.success ? "ready" : "failed",
          compileDiagnostics: data.diagnostics || [],
        } : current);
      })
      .catch((error) => {
        setAssistantProposal((current) => current?.id === token ? {
          ...current,
          compileStatus: "failed",
          compileDiagnostics: [{ severity: "error", message: error instanceof Error ? error.message : "Quire Draft could not compile this proposal." }],
        } : current);
      });
    return token;
  }, [params.projectId]);

  const previewAssistantSuggestion = useCallback((replacement: string, selection: WritingSelection) => {
    if (!activeFile || !replacement) return false;
    if (assistantProposal) return false;
    const currentContent = fileContents[activeFile] || "";
    if (currentContent.slice(selection.from, selection.to) !== selection.text) return false;

    const previewContent = `${currentContent.slice(0, selection.from)}${replacement}${currentContent.slice(selection.to)}`;
    beginAssistantProposal({
      filePath: activeFile,
      originalContent: currentContent,
      previewContent,
      previewRange: { from: selection.from, to: selection.from + replacement.length },
      selection,
      label: "Suggested revision",
    });
    return true;
  }, [activeFile, assistantProposal, beginAssistantProposal, fileContents]);

  const previewActiveDocumentFromDraft = useCallback((replacement: string) => {
    if (!activeFile || !isEditableTextFile(activeFile) || !replacement.trim()) return false;
    if (assistantProposal) return false;
    beginAssistantProposal({ filePath: activeFile, originalContent: fileContents[activeFile] || "", previewContent: replacement, label: "LaTeX draft" });
    setPreviewedAsset(null);
    return true;
  }, [activeFile, assistantProposal, beginAssistantProposal, fileContents]);

  const acceptAssistantProposal = useCallback(() => {
    if (!assistantProposal || assistantProposal.filePath !== activeFile) return;
    if ((fileContents[activeFile] || "") !== assistantProposal.originalContent) {
      setAssistantProposal(null);
      return;
    }
    discardDraftPreview(assistantProposal.id);
    updateFileContent(activeFile, assistantProposal.previewContent);
    if (assistantProposal.previewRange) {
      const { from, to } = assistantProposal.previewRange;
      setAssistantSelection({ from, to, text: assistantProposal.previewContent.slice(from, to) });
    } else {
      setAssistantSelection(null);
    }
    setAssistantProposal(null);
  }, [activeFile, assistantProposal, discardDraftPreview, fileContents, updateFileContent]);

  const rejectAssistantProposal = useCallback(() => {
    if (assistantProposal) discardDraftPreview(assistantProposal.id);
    setAssistantProposal(null);
  }, [assistantProposal, discardDraftPreview]);

  useEffect(() => {
    const token = assistantProposal?.id;
    return () => {
      if (token) discardDraftPreview(token);
    };
  }, [assistantProposal?.id, discardDraftPreview]);

  useEffect(() => {
    setAssistantSelection(null);
    setAssistantProposal(null);
  }, [activeFile]);

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

  const setAutoCompileEnabled = useCallback((enabled: boolean) => {
    // Auto-compile depends on saving the source first. The visible control and
    // the native File menu intentionally call this same setter so they cannot
    // fall out of sync on macOS or Windows.
    void updateProjectSettings(enabled
      ? { autoSave: true, autoCompile: true }
      : { autoCompile: false });
  }, [updateProjectSettings]);

  const moveProjectItem = useCallback(async (from: string, destinationFolder: string) => {
    try {
      const response = await fetch(`/api/projects/${params.projectId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, destinationFolder }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.path !== "string") throw new Error(result.error || "Unable to move the item.");

      const movedPath = result.path;
      movePath(from, movedPath);
      if (project?.rootFile === from || project?.rootFile.startsWith(`${from}/`)) {
        const nextRootFile = `${movedPath}${project.rootFile.slice(from.length)}`;
        await updateProjectSettings({ rootFile: nextRootFile });
      }
      await refreshTree();
      setDiagnostics([{ severity: "info", message: `Moved “${from.split("/").pop()}” to “${destinationFolder}”.` }]);
    } catch (error) {
      setDiagnostics([{ severity: "error", message: error instanceof Error ? error.message : "Unable to move the item." }]);
    }
  }, [movePath, params.projectId, project?.rootFile, refreshTree, setDiagnostics, updateProjectSettings]);

  const createFile = useCallback(async () => {
    const path = newFilePath.trim();
    if (!path) {
      setNewFileError("Give the file a name first.");
      return;
    }

    try {
      setNewFileError("");
      const response = await fetch(`/api/projects/${params.projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create the file.");

      await refreshTree();
      setShowNewFile(false);
      setNewFilePath("");
      await handleSelectFile(path);
    } catch (error) {
      setNewFileError(error instanceof Error ? error.message : "Unable to create the file.");
    }
  }, [handleSelectFile, newFilePath, params.projectId, refreshTree]);

  const createFolder = useCallback(async () => {
    const path = newFolderPath.trim().replace(/\/+$/, "");
    if (!path) {
      setNewFolderError("Give the folder a name first.");
      return;
    }

    try {
      setNewFolderError("");
      const response = await fetch(`/api/projects/${params.projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, kind: "folder" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create the folder.");

      await refreshTree();
      setShowNewFolder(false);
      setNewFolderPath("");
      setDiagnostics([{ severity: "info", message: `Created folder “${path}”.` }]);
    } catch (error) {
      setNewFolderError(error instanceof Error ? error.message : "Unable to create the folder.");
    }
  }, [newFolderPath, params.projectId, refreshTree, setDiagnostics]);

  const uploadAssets = useCallback(async (files: Iterable<File>) => {
    const uploads = Array.from(files).filter((file) => file.size > 0);
    if (uploads.length === 0) return;
    setIsUploading(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of uploads) {
        const data = new FormData();
        data.set("file", file);
        const response = await fetch(`/api/projects/${params.projectId}/files`, { method: "POST", body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Unable to upload “${file.name}”.`);
        uploadedPaths.push(typeof result.path === "string" ? result.path : `assets/${file.name}`);
      }

      await refreshTree();
      const uploadedPath = uploadedPaths[uploadedPaths.length - 1];
      const uploadedKind = assetKind(uploadedPath);
      if (uploadedKind) setPreviewedAsset({ path: uploadedPath, kind: uploadedKind });
      setDiagnostics([{ severity: "info", message: uploads.length === 1 ? `Uploaded “${uploads[0].name}” to assets.` : `Uploaded ${uploads.length} files to assets.` }]);
    } catch (error) {
      setDiagnostics([{ severity: "error", message: error instanceof Error ? error.message : "Unable to upload the file." }]);
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }, [params.projectId, refreshTree, setDiagnostics]);

  const acceptsFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  const handleWorkspaceDragEnter = (event: React.DragEvent) => {
    if (!acceptsFiles(event)) return;
    event.preventDefault();
    workspaceDragDepthRef.current += 1;
    setIsFileDropActive(true);
  };
  const handleWorkspaceDragOver = (event: React.DragEvent) => {
    if (!acceptsFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };
  const handleWorkspaceDragLeave = (event: React.DragEvent) => {
    if (!acceptsFiles(event)) return;
    workspaceDragDepthRef.current = Math.max(0, workspaceDragDepthRef.current - 1);
    if (workspaceDragDepthRef.current === 0) setIsFileDropActive(false);
  };
  const handleWorkspaceDrop = (event: React.DragEvent) => {
    if (!acceptsFiles(event)) return;
    event.preventDefault();
    workspaceDragDepthRef.current = 0;
    setIsFileDropActive(false);
    void uploadAssets(event.dataTransfer.files);
  };

  const requestDeleteNode = useCallback((node: ProjectNode) => {
    if (node.path === project?.rootFile) {
      setDiagnostics([{ severity: "error", message: "Choose another main document before deleting this file." }]);
      return;
    }

    setNodePendingDeletion(node);
  }, [project?.rootFile, setDiagnostics]);

  const deleteNode = useCallback(async () => {
    const node = nodePendingDeletion;
    if (!node) return;

    try {
      const desktop = desktopBridge();
      if (desktop?.trashProjectItem) {
        await desktop.trashProjectItem({ projectId: params.projectId, path: node.path });
      } else {
        const response = await fetch(`/api/projects/${params.projectId}/files?path=${encodeURIComponent(node.path)}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to delete the file.");
      }

      forgetPath(node.path);
      await refreshTree();
      setDiagnostics([{ severity: "info", message: `Moved “${node.name}” to the Trash.` }]);
      setNodePendingDeletion(null);
    } catch (error) {
      setDiagnostics([{ severity: "error", message: error instanceof Error ? error.message : "Unable to delete the file." }]);
    }
  }, [forgetPath, nodePendingDeletion, params.projectId, refreshTree, setDiagnostics]);

  const requestDashboardNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!hasDirtyFiles) return;
    event.preventDefault();
    setUnsavedAction({ type: "dashboard" });
  };

  const requestCloseFile = (path: string) => {
    if (isDirty[path]) {
      setUnsavedAction({ type: "close-file", path });
      return;
    }
    closeFile(path);
  };

  const discardUnsavedAction = () => {
    if (unsavedAction?.type === "dashboard") router.push("/app");
    if (unsavedAction?.type === "close-file") closeFile(unsavedAction.path);
    setUnsavedAction(null);
  };

  const setMainDocument = useCallback((path: string) => {
    void updateProjectSettings({ rootFile: path });
  }, [updateProjectSettings]);

  const downloadPdf = useCallback(async () => {
    const filename = (project?.rootFile || "document.tex").replace(/\.tex$/i, ".pdf");
    const desktop = desktopBridge();

    if (desktop?.savePdf) {
      try {
        const result = await desktop.savePdf({ projectId: params.projectId, filename });
        if (!result.cancelled) {
          setDiagnostics([{ severity: "info", message: "PDF saved to your chosen location." }]);
        }
      } catch (error) {
        setDiagnostics([{ severity: "error", message: error instanceof Error ? error.message : "The PDF could not be saved." }]);
      }
      return;
    }

    const link = document.createElement("a");
    link.href = `/api/projects/${params.projectId}/pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [params.projectId, project?.rootFile, setDiagnostics]);

  useEffect(() => {
    const desktop = desktopBridge();
    if (!desktop?.onMenuCommand) return;

    return desktop.onMenuCommand((command) => {
      switch (command.type) {
        case "new-file":
          setNewFileError("");
          setShowNewFile(true);
          break;
        case "new-folder":
          setNewFolderError("");
          setShowNewFolder(true);
          break;
        case "save-all":
          void saveDirtyFiles(Object.keys(isDirty));
          break;
        case "recompile":
          void compileProject();
          break;
        case "export-pdf":
          void downloadPdf();
          break;
        case "toggle-explorer":
          toggleExplorer();
          break;
        case "set-auto-save":
          void updateProjectSettings(command.enabled
            ? { autoSave: true }
            : { autoSave: false, autoCompile: false });
          break;
        case "set-auto-compile":
          setAutoCompileEnabled(command.enabled);
          break;
      }
    });
  }, [compileProject, downloadPdf, isDirty, saveDirtyFiles, setAutoCompileEnabled, toggleExplorer, updateProjectSettings]);

  useEffect(() => {
    const autoSave = project?.autoSave;
    const autoCompile = project?.autoCompile;
    if (typeof autoSave !== "boolean" || typeof autoCompile !== "boolean") return;
    desktopBridge()?.setMenuState?.({ autoSave, autoCompile });
  }, [project?.autoCompile, project?.autoSave]);

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

  // Auto-save is deliberately independent from compiling so writers can keep
  // their files safe without triggering a PDF build after every pause.
  useEffect(() => {
    if (!project?.autoSave) return;
    
    const dirtyPaths = Object.keys(isDirty).filter(p => isDirty[p]);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (dirtyPaths.length > 0) {
      saveTimeoutRef.current = setTimeout(async () => {
        saveTimeoutRef.current = null;
        const saved = await saveDirtyFiles(dirtyPaths);
        if (saved && project.autoCompile) void compileProject({ flushDirty: false });
      }, project.autoCompileDelayMs ?? 800);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [compileProject, fileContents, isDirty, project?.autoCompile, project?.autoCompileDelayMs, project?.autoSave, saveDirtyFiles]);

  useEffect(() => {
    const enabled = Boolean(project?.autoCompile);
    const wasEnabled = autoCompileWasEnabledRef.current;
    autoCompileWasEnabledRef.current = enabled;

    if (enabled && !wasEnabled && activeFile && isEditableTextFile(activeFile)) {
      void compileProject();
    }
  }, [activeFile, compileProject, project?.autoCompile]);

  const visibleAssistantProposal = assistantProposal?.filePath === activeFile ? assistantProposal : null;
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  
  return (
    <div className="quire-workspace relative h-screen flex flex-col bg-[var(--quire-bg)] text-[var(--quire-text)] overflow-hidden" onDragEnter={handleWorkspaceDragEnter} onDragOver={handleWorkspaceDragOver} onDragLeave={handleWorkspaceDragLeave} onDrop={handleWorkspaceDrop}>
      <QuickOpen isOpen={isQuickOpen} onClose={() => setIsQuickOpen(false)} />
      <WritingAssistant
        selection={assistantSelection}
        activeFileName={activeFile}
        onPreviewSuggestion={previewAssistantSuggestion}
        onPreviewDocument={previewActiveDocumentFromDraft}
        diagnosticFixRequest={diagnosticFixRequest}
        onDiagnosticFixRequestHandled={() => setDiagnosticFixRequest(null)}
      />
      {assistantProposal && (
        <aside className="fixed bottom-14 left-1/2 z-[60] flex w-[min(calc(100vw-2rem),38rem)] -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--quire-border)] bg-[color-mix(in_srgb,var(--quire-surface)_94%,transparent)] px-4 py-3 text-[var(--quire-text)] shadow-[0_18px_44px_rgba(0,0,0,.22)] backdrop-blur-xl" aria-label="Quire Draft suggestion review">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--quire-red-soft)] text-[var(--quire-red)]">{assistantProposal.compileStatus === "compiling" ? <Loader2 className="h-4 w-4 animate-spin" /> : "✦"}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{assistantProposal.compileStatus === "compiling" ? "Compiling Quire Draft preview…" : assistantProposal.compileStatus === "ready" ? "PDF proposal ready to review" : "Proposal could not compile"}</p><p className="text-xs text-[var(--quire-muted)]">{assistantProposal.compileStatus === "compiling" ? "Your original source and PDF remain untouched." : assistantProposal.compileStatus === "ready" ? "Review the highlighted source and temporary PDF. Nothing is saved until you apply it." : "Your original source and PDF remain untouched. Review the source or reject it."}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={rejectAssistantProposal} className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--quire-text-secondary)] transition-colors hover:bg-[var(--quire-hover)]">Reject</button>
            <button type="button" onClick={acceptAssistantProposal} className="rounded-xl bg-[var(--quire-red)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(255,0,0,.17)] transition-transform hover:-translate-y-px">Apply change</button>
          </div>
        </aside>
      )}
      {/* Top Application Bar */}
      <header className="quire-workspace-header h-14 border-b border-[var(--quire-border)] bg-[color-mix(in_srgb,var(--quire-surface)_92%,transparent)] backdrop-blur-xl flex items-center justify-between px-4 sm:px-5 shrink-0 transition-colors duration-200 ease-out shadow-[0_1px_0_rgba(20,20,20,.02)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            href="/app"
            onClick={requestDashboardNavigation}
            aria-label="Go back to menu"
            title="Go back to menu"
            className="group/menu inline-flex h-8 shrink-0 items-center gap-2 rounded-[10px] bg-[var(--quire-red-soft)] px-1.5 text-[var(--quire-text)] transition-all hover:scale-[1.03] hover:pr-2.5"
          >
            <QuireMark className="w-5 h-5" />
            <span className="hidden text-[11px] font-semibold sm:inline">Back to menu</span>
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
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(project?.autoCompile)}
            onClick={() => setAutoCompileEnabled(!project?.autoCompile)}
            className="hidden md:flex items-center gap-2 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors duration-150 ease-out"
            title={project?.autoCompile ? "Turn off auto compile" : "Turn on auto compile"}
          >
            <span className="text-[11px] font-semibold">Auto compile</span>
            <span className={`relative inline-flex h-[18px] w-8 rounded-full shadow-inner transition-colors ${project?.autoCompile ? "bg-[var(--quire-red)]" : "bg-[var(--quire-border)]"}`}>
              <span className={`absolute top-[3px] h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${project?.autoCompile ? "translate-x-[17px]" : "translate-x-[3px]"}`} />
            </span>
          </button>

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
              const current = document.documentElement.getAttribute('data-theme');
              const next = current === 'dark' ? 'light' : 'dark';
              applyThemeWithFade(next);
              localStorage.setItem('quire:theme', next);
              const desktop = desktopBridge();
              void desktop?.setWindowAppearance?.(next);
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

      <Dialog.Root open={showNewFile} onOpenChange={(open) => {
        setShowNewFile(open);
        if (!open) {
          setNewFilePath("");
          setNewFileError("");
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),27rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,.25)] focus:outline-none">
            <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">New file</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-5 text-[var(--quire-muted)]">Create a file inside this project. You can use folders, for example <code className="rounded bg-[var(--quire-hover)] px-1 py-0.5">chapters/intro.tex</code>.</Dialog.Description>
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void createFile(); }}>
              <label className="block text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="new-file-path">File name</label>
              <input
                id="new-file-path"
                autoFocus
                value={newFilePath}
                onChange={(event) => setNewFilePath(event.target.value)}
                placeholder="notes.tex"
                className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--quire-red)]"
              />
              {newFileError && <p className="mt-2 text-xs text-[var(--quire-red)]">{newFileError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--quire-muted)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]">Cancel</Dialog.Close>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--quire-red)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(255,0,0,.2)] hover:brightness-95"><FilePlus className="h-4 w-4" />Create file</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={showNewFolder} onOpenChange={(open) => {
        setShowNewFolder(open);
        if (!open) {
          setNewFolderPath("");
          setNewFolderError("");
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),27rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,.25)] focus:outline-none">
            <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">New folder</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm leading-5 text-[var(--quire-muted)]">Create an empty folder inside this project. You can nest folders, for example <code className="rounded bg-[var(--quire-hover)] px-1 py-0.5">chapters/figures</code>.</Dialog.Description>
            <form className="mt-5" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}>
              <label className="block text-xs font-semibold text-[var(--quire-text-secondary)]" htmlFor="new-folder-path">Folder name</label>
              <input
                id="new-folder-path"
                autoFocus
                value={newFolderPath}
                onChange={(event) => setNewFolderPath(event.target.value)}
                placeholder="chapters"
                className="mt-2 w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--quire-red)]"
              />
              {newFolderError && <p className="mt-2 text-xs text-[var(--quire-red)]">{newFolderError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--quire-muted)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]">Cancel</Dialog.Close>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--quire-red)] px-3.5 py-2 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(255,0,0,.2)] hover:brightness-95"><FolderPlus className="h-4 w-4" />Create folder</button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmationDialog
        open={Boolean(nodePendingDeletion)}
        onOpenChange={(open) => { if (!open) setNodePendingDeletion(null); }}
        title={nodePendingDeletion ? `Move “${nodePendingDeletion.name}” to the Trash?` : "Move this item to the Trash?"}
        description={nodePendingDeletion?.type === "directory" ? "This folder and everything inside it will be moved to the Trash or Recycle Bin. You can restore it from there if needed." : "This file will be moved to the Trash or Recycle Bin. You can restore it from there if needed."}
        confirmLabel="Move to Trash"
        onConfirm={() => void deleteNode()}
      />

      <ConfirmationDialog
        open={Boolean(unsavedAction)}
        onOpenChange={(open) => { if (!open) setUnsavedAction(null); }}
        title="Discard unsaved changes?"
        description={unsavedAction?.type === "dashboard" ? "You have changes that have not been saved. Going back to the menu will discard them." : "You have changes that have not been saved. Closing this file will discard them."}
        confirmLabel={unsavedAction?.type === "dashboard" ? "Go to menu" : "Close without saving"}
        cancelLabel="Keep editing"
        tone="default"
        onConfirm={discardUnsavedAction}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-hidden relative">
        {isFileDropActive && <div className="pointer-events-none absolute inset-3 z-[70] grid place-items-center rounded-2xl border-2 border-dashed border-[var(--quire-red)] bg-[color-mix(in_srgb,var(--quire-red-soft)_82%,transparent)] backdrop-blur-[2px]"><div className="rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] px-6 py-4 text-center shadow-[0_18px_44px_rgba(0,0,0,.16)]"><Upload className="mx-auto h-6 w-6 text-[var(--quire-red)]" /><p className="mt-2 text-sm font-semibold">Drop files to add them to this project</p><p className="mt-1 text-xs text-[var(--quire-muted)]">They will be saved locally in the assets folder.</p></div></div>}
        {isExplorerCollapsed && <button type="button" aria-label="Open Files sidebar" onClick={toggleExplorer} className="absolute left-3 top-3 z-50 inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--quire-border)] bg-[color-mix(in_srgb,var(--quire-surface)_94%,transparent)] px-2.5 text-xs font-semibold text-[var(--quire-text-secondary)] shadow-sm backdrop-blur-xl transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"><PanelLeftOpen className="h-4 w-4" /><span>Files</span></button>}
        <PanelGroup orientation="horizontal">
          {/* Project Explorer */}
          <Panel 
            panelRef={explorerPanelRef}
            defaultSize={19}
            minSize={15}
            collapsible 
            collapsedSize={0}
            onResize={(size) => {
              const collapsed = size.inPixels <= 1;
              if (collapsed !== isExplorerCollapsed) {
                setIsExplorerCollapsed(collapsed);
                localStorage.setItem('quire:sidebar-collapsed', collapsed.toString());
              }
            }}
            className="bg-[var(--quire-surface-secondary)] transition-[flex-basis] duration-200 ease-in-out"
          >
            <div className="h-full flex flex-col border-r border-[var(--quire-border)] min-w-[200px]">
              <div className="px-3.5 border-b border-[var(--quire-border)] text-[10px] font-semibold tracking-[.1em] uppercase text-[var(--quire-muted)] flex justify-between items-center h-10">
                <span>Files</span>
                <div className="flex items-center gap-0.5">
                  <input ref={uploadInputRef} type="file" multiple className="sr-only" onChange={(event) => void uploadAssets(event.target.files || [])} />
                  <button type="button" title="Upload a file" aria-label="Upload a file" disabled={isUploading} onClick={() => uploadInputRef.current?.click()} className="p-1.5 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded-[7px] text-[var(--quire-muted)] transition-all duration-150 ease-out disabled:cursor-wait disabled:opacity-50">
                    <Upload className={`w-3.5 h-3.5 ${isUploading ? "animate-pulse" : ""}`} />
                  </button>
                  <button type="button" title="New file (⌘N)" aria-label="Create a new file" onClick={() => { setNewFileError(""); setShowNewFile(true); }} className="p-1.5 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded-[7px] text-[var(--quire-muted)] transition-all duration-150 ease-out">
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" title="New folder (⌘⇧N)" aria-label="Create a new folder" onClick={() => { setNewFolderError(""); setShowNewFolder(true); }} className="p-1.5 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded-[7px] text-[var(--quire-muted)] transition-all duration-150 ease-out">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Collapse file explorer" onClick={toggleExplorer} className="p-1.5 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded-[7px] text-[var(--quire-muted)] transition-all duration-150 ease-out">
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-2.5 overflow-auto">
                <ProjectTree 
                  nodes={tree} 
                  selectedPath={previewedAsset?.path || activeFile || ""}
                  onSelect={handleSelectFile} 
                  onDelete={requestDeleteNode}
                  onSetMainDocument={setMainDocument}
                  onMove={moveProjectItem}
                />
              </div>
            </div>
          </Panel>
          
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
                      onClick={() => { setPreviewedAsset(null); setActiveFile(file); }}
                    >
                      <span className="truncate max-w-[120px]">{file.split('/').pop()}</span>
                      {isDirty[file] && <span className={`w-1.5 h-1.5 rounded-full ${activeFile === file ? 'bg-[var(--quire-red)]' : 'bg-[var(--quire-muted)]'} shrink-0`}></span>}
                      <X 
                        className={`w-3.5 h-3.5 rounded-sm shrink-0 transition-colors duration-150 ease-out p-0.5 box-content
                          ${activeFile === file ? 'text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)]' : 'text-transparent group-hover:text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)]'}`}
                        onClick={(e) => { e.stopPropagation(); requestCloseFile(file); }}
                      />
                      {activeFile === file && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--quire-red)]" />}
                    </div>
                  ))
                )}
              </div> {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {previewedAsset?.kind === "image" ? (
                  <div className="flex h-full flex-col items-center justify-center overflow-auto bg-[var(--quire-surface-secondary)] p-8">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[var(--quire-muted)]"><ImageIcon className="h-4 w-4" /> IMAGE ASSET</div>
                    <img src={`/api/projects/${params.projectId}/asset?path=${encodeURIComponent(previewedAsset.path)}`} alt={previewedAsset.path.split("/").pop() || "Uploaded image"} className="max-h-[calc(100vh-15rem)] max-w-full rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] object-contain shadow-[0_16px_40px_rgba(0,0,0,.12)]" />
                    <p className="mt-4 text-sm text-[var(--quire-muted)]">{previewedAsset.path}</p>
                  </div>
                ) : previewedAsset?.kind === "pdf" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--quire-surface-secondary)] p-8 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--quire-border)] bg-[var(--quire-surface)] text-[var(--quire-red)] shadow-sm"><FileText className="h-6 w-6" /></div>
                    <div><p className="text-sm font-semibold">{previewedAsset.path.split("/").pop()}</p><p className="mt-1 max-w-xs text-sm leading-6 text-[var(--quire-muted)]">This PDF is open in the preview panel. Use its page controls and zoom to read it here.</p></div>
                  </div>
                ) : activeFile ? (
                  <>
                    {visibleAssistantProposal && <div className="flex shrink-0 items-center gap-2 border-b border-[var(--quire-red)]/30 bg-[var(--quire-red-soft)] px-4 py-2 text-xs text-[var(--quire-text-secondary)]"><span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--quire-red)] text-[11px] text-white">✦</span><span><strong className="text-[var(--quire-text)]">Quire Draft preview</strong> — this is a temporary proposed change. Apply or reject it below.</span></div>}
                    <Editor
                    key={`${activeFile}:${visibleAssistantProposal ? "draft-preview" : "source"}`}
                    value={visibleAssistantProposal ? visibleAssistantProposal.previewContent : fileContents[activeFile] || ""}
                    onChange={handleEditorChange} 
                    onSelectionChange={handleAssistantSelection}
                    proposalRange={visibleAssistantProposal?.previewRange}
                    readOnly={Boolean(visibleAssistantProposal)}
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
                  </>
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
            {visibleAssistantProposal?.compileStatus === "compiling" ? (
              <div className="flex h-full flex-col items-center justify-center bg-[var(--quire-pdf-bg)] px-6 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--quire-red-soft)] text-[var(--quire-red)]"><Loader2 className="h-5 w-5 animate-spin" /></span>
                <p className="mt-4 text-sm font-semibold text-[var(--quire-text)]">Building your temporary PDF preview</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--quire-muted)]">Quire Draft is compiling an isolated copy of this proposal. Your project files and current PDF will not change.</p>
              </div>
            ) : visibleAssistantProposal?.compileStatus === "failed" ? (
              <div className="flex h-full flex-col items-center justify-center bg-[var(--quire-pdf-bg)] px-6 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--quire-red-soft)] text-[var(--quire-red)]">!</span>
                <p className="mt-4 text-sm font-semibold text-[var(--quire-text)]">This proposal did not compile</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--quire-muted)]">{visibleAssistantProposal.compileDiagnostics.find((diagnostic) => diagnostic.severity === "error")?.message || "Review the highlighted source, then reject it or apply it and continue editing."}</p>
              </div>
            ) : (
              <div className="relative h-full w-full min-w-0">
                {visibleAssistantProposal && <div className="pointer-events-none absolute left-3 top-[3.75rem] z-20 rounded-lg border border-[var(--quire-red)]/25 bg-[color-mix(in_srgb,var(--quire-surface)_94%,transparent)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--quire-text-secondary)] shadow-sm backdrop-blur-xl"><span className="mr-1 text-[var(--quire-red)]">✦</span> Quire Draft temporary PDF preview</div>}
                <PDFViewer
                  url={visibleAssistantProposal ? `/api/projects/${params.projectId}/draft-preview?token=${encodeURIComponent(visibleAssistantProposal.id)}` : previewedAsset?.kind === "pdf" ? `/api/projects/${params.projectId}/asset?path=${encodeURIComponent(previewedAsset.path)}` : `/api/projects/${params.projectId}/pdf?rev=${pdfRevision}`}
                  documentName={visibleAssistantProposal ? "Quire Draft preview.pdf" : previewedAsset?.kind === "pdf" ? previewedAsset.path.split("/").pop() : undefined}
                  onDownload={visibleAssistantProposal || previewedAsset?.kind === "pdf" ? undefined : () => void downloadPdf()}
                  isCompiling={isCompiling}
                  compileError={compileError}
                />
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>
      
      {/* Diagnostics / Status Bar */}
      <footer className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--quire-border)] bg-[var(--quire-surface)] px-3 text-xs text-[var(--quire-muted)] sm:px-4">
        <div className="flex items-center gap-2" aria-label="Compiler status">
          <button
            type="button"
            onClick={() => setShowDiagnostics((current) => !current)}
            aria-expanded={showDiagnostics}
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors ${errorCount > 0 ? "border-[var(--quire-red)]/25 bg-[var(--quire-red-soft)] text-[var(--quire-red)] hover:border-[var(--quire-red)]/50" : "border-transparent text-[var(--quire-muted)] hover:bg-[var(--quire-hover)]"}`}
          >
            <span className={`h-2 w-2 rounded-full ${errorCount > 0 ? "bg-[var(--quire-red)] shadow-[0_0_0_3px_var(--quire-red-soft)]" : "bg-[var(--quire-muted)]/55"}`} />
            {errorCount} {errorCount === 1 ? "error" : "errors"}
          </button>
          <button
            type="button"
            onClick={() => setShowDiagnostics((current) => !current)}
            aria-expanded={showDiagnostics}
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-semibold transition-colors ${warningCount > 0 ? "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300 hover:border-amber-400/55" : "border-transparent text-[var(--quire-muted)] hover:bg-[var(--quire-hover)]"}`}
          >
            <span className={`h-2 w-2 rounded-full ${warningCount > 0 ? "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,.12)]" : "bg-[var(--quire-muted)]/55"}`} />
            {warningCount} {warningCount === 1 ? "warning" : "warnings"}
          </button>
        </div>
        {diagnostics.length > 0 && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-[var(--quire-text-secondary)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"
            onClick={() => setShowDiagnostics((current) => !current)}
          >
            <AlertTriangle className={`h-3.5 w-3.5 ${errorCount > 0 ? "text-[var(--quire-red)]" : "text-amber-500"}`} />
            {showDiagnostics ? "Hide details" : "View details"}
          </button>
        )}
      </footer>
      
      {/* Diagnostics Drawer */}
      {showDiagnostics && (
        <section className="absolute inset-x-3 bottom-14 z-50 flex max-h-[min(31rem,calc(100vh-7.5rem))] min-h-56 flex-col overflow-hidden rounded-2xl border border-[var(--quire-border)] bg-[color-mix(in_srgb,var(--quire-surface)_97%,transparent)] shadow-[0_20px_54px_rgba(0,0,0,.22)] backdrop-blur-xl sm:inset-x-5" aria-label="Compiler diagnostics">
          <div className="flex items-center justify-between border-b border-[var(--quire-border)] px-4 py-3">
            <div><h2 className="text-sm font-semibold text-[var(--quire-text)]">Compiler details</h2><p className="mt-0.5 text-xs text-[var(--quire-muted)]">Choose a diagnostic to jump to its source line.</p></div>
            <button type="button" className="rounded-lg p-2 text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]" onClick={() => setShowDiagnostics(false)} aria-label="Close compiler details"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-3 sm:p-4">
            {diagnostics.length === 0 ? (
              <div className="mt-8 text-center text-sm text-[var(--quire-muted)]">No diagnostics to show.</div>
            ) : (
              diagnostics.map((diag, i) => (
                <div 
                  key={i} 
                  className={`group cursor-pointer rounded-xl border p-3.5 transition-colors ${diag.severity === "error" ? "border-[var(--quire-red)]/20 bg-[var(--quire-red-soft)]/45 hover:border-[var(--quire-red)]/40" : "border-amber-400/20 bg-amber-400/5 hover:border-amber-400/40"}`}
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
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${diag.severity === "error" ? "bg-[var(--quire-red)] text-white" : "bg-amber-400/20 text-amber-700 dark:text-amber-300"}`}><AlertTriangle className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div className={`text-[11px] font-bold uppercase tracking-[0.12em] ${diag.severity === "error" ? "text-[var(--quire-red)]" : "text-amber-700 dark:text-amber-300"}`}>{diag.severity}</div><div className="font-mono text-[11px] text-[var(--quire-muted)]">{diag.file || "main.tex"}{diag.line ? `:${diag.line}` : ""}</div></div>
                    <div className="mt-2 max-w-4xl whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--quire-text-secondary)]">{diag.message}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyDiagnostic(diag, `${i}:${diag.file || "main.tex"}:${diag.line || 0}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--quire-border)] bg-[var(--quire-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--quire-text-secondary)] transition-colors hover:border-[var(--quire-text)]/20 hover:text-[var(--quire-text)]"
                      >
                        {copiedDiagnosticKey === `${i}:${diag.file || "main.tex"}:${diag.line || 0}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedDiagnosticKey === `${i}:${diag.file || "main.tex"}:${diag.line || 0}` ? "Copied" : "Copy error"}
                      </button>
                    {diag.severity === "error" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void requestDiagnosticFix(diag);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--quire-red)]/30 bg-[var(--quire-red-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--quire-red)] transition-colors hover:border-[var(--quire-red)] hover:bg-[var(--quire-red)] hover:text-white"
                      >
                        <span aria-hidden="true">✦</span> Fix with Quire Draft
                      </button>
                    )}
                    </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
