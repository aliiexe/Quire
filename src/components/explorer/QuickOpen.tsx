"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProjectNode } from "@/lib/projects/storage";
import { useWorkspaceStore } from "@/stores/workspace";

function getAllFiles(nodes: ProjectNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "file") return [node.path];
    return node.children ? getAllFiles(node.children) : [];
  });
}

export function QuickOpen({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { tree } = useWorkspaceStore();
  const [search, setSearch] = useState("");
  const results = useMemo(() => {
    const all = getAllFiles(tree);
    if (!search) return all;
    const term = search.toLowerCase();
    return all.filter(path => path.toLowerCase().includes(term));
  }, [search, tree]);

  const close = () => {
    setSearch("");
    onClose();
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
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/20" onClick={close}>
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
