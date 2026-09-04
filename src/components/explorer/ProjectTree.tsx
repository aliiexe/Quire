"use client";

import { File, FileText, Image as ImageIcon, MoreVertical, ChevronRight, ChevronDown } from "lucide-react";
import { ProjectNode } from "@/lib/projects/storage";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useWorkspaceStore } from "@/stores/workspace";

interface ProjectTreeProps {
  nodes: ProjectNode[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onDelete?: (node: ProjectNode) => void;
  onSetMainDocument?: (path: string) => void;
  level?: number;
}

export function ProjectTree({ nodes, selectedPath, onSelect, onDelete, onSetMainDocument, level = 0 }: ProjectTreeProps) {
  const { expandedFolders, toggleFolder, isDirty } = useWorkspaceStore();
  
  if (!nodes || nodes.length === 0) return null;

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.tex') || filename.endsWith('.sty') || filename.endsWith('.cls')) return <FileText className="w-3.5 h-3.5" />;
    if (filename.endsWith('.png') || filename.endsWith('.jpg')) return <ImageIcon className="w-3.5 h-3.5" />;
    return <File className="w-3.5 h-3.5" />;
  };

  return (
    <div className="w-full text-[13px]">
      {nodes.map((node, i) => {
        const isDir = node.type === "directory";
        const actuallyExpanded = isDir ? (expandedFolders[node.path] !== undefined ? expandedFolders[node.path] : level === 0) : false;
        const isSelected = node.path === selectedPath;
        const dirty = isDirty[node.path];

        return (
          <div key={`${node.path}-${i}`} className="flex flex-col">
            <div 
              className={`flex items-center gap-2 h-[32px] px-2 cursor-pointer select-none group relative transition-all duration-150 ease-out
                ${isSelected ? 'bg-[var(--quire-active-line)] text-[var(--quire-text)] font-medium' : 'text-[var(--quire-text-secondary)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]'}
              `}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => {
                if (isDir) {
                  toggleFolder(node.path);
                } else {
                  onSelect(node.path);
                }
              }}
            >
              {isSelected && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-[var(--quire-red)] rounded-full" />
              )}
              
              {isDir ? (
                actuallyExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 opacity-70">
                  {getFileIcon(node.name)}
                </span>
              )}
              
              <span className="truncate flex-1">{node.name}</span>
              
              {dirty && !isDir && (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-text)] shrink-0 opacity-50" />
              )}
              
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button 
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] rounded transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="min-w-[160px] bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-[10px] p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 text-[13px] text-[var(--quire-text)] font-medium transition-all duration-150 ease-out"
                    align="end"
                  >
                    <DropdownMenu.Item
                      className="px-2 py-1.5 outline-none cursor-pointer rounded hover:bg-[var(--quire-bg)] hover:text-[var(--quire-red)] text-[var(--quire-red)]"
                      onSelect={(event) => {
                        event.preventDefault();
                        onDelete?.(node);
                      }}
                    >
                      Delete
                    </DropdownMenu.Item>
                    {!isDir && node.name.endsWith('.tex') && (
                      <>
                        <DropdownMenu.Separator className="h-px bg-[var(--quire-border)] my-1" />
                        <DropdownMenu.Item
                          className="px-2 py-1.5 outline-none cursor-pointer rounded hover:bg-[var(--quire-bg)] hover:text-[var(--quire-text)]"
                          onSelect={() => onSetMainDocument?.(node.path)}
                        >
                          Set as main document
                        </DropdownMenu.Item>
                      </>
                    )}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            
            {/* Smooth collapse container */}
            {isDir && node.children && (
              <div 
                className={`grid transition-[grid-template-rows] duration-[150ms] ease-in-out ${actuallyExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <ProjectTree 
                    nodes={node.children} 
                    selectedPath={selectedPath} 
                    onSelect={onSelect}
                    onDelete={onDelete}
                    onSetMainDocument={onSetMainDocument}
                    level={level + 1}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
