"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { ProjectNode } from "@/lib/projects/storage";
import { useWorkspaceStore } from "@/stores/workspace";

export function QuickOpen({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { tree, openFile } = useWorkspaceStore();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setResults(getAllFiles(tree));
    }
  }, [isOpen, tree]);

  useEffect(() => {
    const all = getAllFiles(tree);
    if (!search) {
      setResults(all);
      return;
    }
    const term = search.toLowerCase();
    setResults(all.filter(path => path.toLowerCase().includes(term)));
  }, [search, tree]);

  const getAllFiles = (nodes: ProjectNode[]): string[] => {
    let files: string[] = [];
    for (const node of nodes) {
      if (node.type === "file") files.push(node.path);
      if (node.type === "directory" && node.children) {
        files = [...files, ...getAllFiles(node.children)];
      }
    }
    return files;
  };

  const handleSelect = (path: string) => {
    // In a real app, we fetch first. The Workspace component handles fetch.
    // For now we just trigger it by simulating a file open.
    // To make it simple, we can emit an event or pass a callback.
    // For now, Workspace handles selection via onSelect. 
    // We can just set active file in the store and let the Workspace effect catch it, 
    // but the store `openFile` expects content. 
    // Actually, we can dispatch a custom event that Workspace listens to.
    window.dispatchEvent(new CustomEvent('quire-quick-open', { detail: path }));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/20" onClick={onClose}>
      <div 
        className="bg-[var(--quire-surface)] border border-[var(--quire-border)] w-full max-w-lg rounded-xl shadow-lg flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--quire-border)]">
          <Search className="w-5 h-5 text-[var(--quire-muted)] mr-3" />
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[var(--quire-text)] placeholder:text-[var(--quire-muted)]"
            placeholder="Search files by name (Cmd+P)"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-8 text-center text-[var(--quire-muted)] text-sm">No files found</div>
          ) : (
            results.map(path => (
              <div 
                key={path}
                className="px-4 py-2 text-sm text-[var(--quire-text)] hover:bg-[var(--quire-bg)] cursor-pointer truncate"
                onClick={() => handleSelect(path)}
              >
                {path}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
