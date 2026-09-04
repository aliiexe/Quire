"use client";

import { Settings as SettingsIcon, X, Check, ChevronDown, Monitor, Sun, Moon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { Project } from "@/lib/projects/storage";
import { useEffect, useState } from "react";

interface SettingsModalProps {
  project: Project | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Project>) => void;
}

export function SettingsModal({ project, onClose, onUpdate }: SettingsModalProps) {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    const stored = localStorage.getItem("quire:theme") as any;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    const root = document.documentElement;
    if (newTheme === "system") {
      localStorage.removeItem("quire:theme");
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      localStorage.setItem("quire:theme", newTheme);
      root.setAttribute("data-theme", newTheme);
    }
  };

  if (!project) return null;

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-all duration-200" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[var(--quire-surface)] border border-[var(--quire-border)] w-[90vw] max-w-[480px] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 p-6 flex flex-col focus:outline-none transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-semibold text-[var(--quire-text)] tracking-tight">
              Settings
            </Dialog.Title>
            <Dialog.Close className="text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] p-1.5 rounded-full transition-all">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-6 text-[13px] text-[var(--quire-text)]">
            
            {/* Appearance Section */}
            <div className="space-y-3">
              <label className="font-medium text-[var(--quire-text-secondary)] uppercase tracking-wider text-[11px]">Appearance</label>
              <div className="bg-[var(--quire-surface-secondary)] border border-[var(--quire-border)] rounded-xl p-1 flex gap-1">
                {(["system", "light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-out ${
                      theme === t 
                        ? "bg-[var(--quire-surface)] text-[var(--quire-text)] shadow-sm ring-1 ring-black/5 dark:ring-white/10" 
                        : "text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)]"
                    }`}
                  >
                    {t === "system" && <Monitor className="w-4 h-4" />}
                    {t === "light" && <Sun className="w-4 h-4" />}
                    {t === "dark" && <Moon className="w-4 h-4" />}
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Build Section */}
            <div className="space-y-3">
              <label className="font-medium text-[var(--quire-text-secondary)] uppercase tracking-wider text-[11px]">Build</label>
              <div className="bg-[var(--quire-surface-secondary)] border border-[var(--quire-border)] rounded-xl overflow-hidden divide-y divide-[var(--quire-border)]">
                
                {/* Compiler */}
                <div className="flex items-center justify-between p-3.5">
                  <label className="font-medium">Compiler</label>
                  <Select.Root value={project.compiler} onValueChange={(val) => onUpdate({ compiler: val as any })}>
                    <Select.Trigger className="inline-flex items-center gap-2 justify-between rounded-lg px-3 py-1.5 text-sm bg-[var(--quire-surface)] border border-[var(--quire-border)] w-[140px] outline-none focus:border-[var(--quire-text)] shadow-sm transition-all">
                      <Select.Value />
                      <Select.Icon>
                        <ChevronDown className="w-4 h-4 text-[var(--quire-muted)]" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="overflow-hidden bg-[var(--quire-surface)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[var(--quire-border)] z-[60] py-1">
                        <Select.Viewport>
                          {(["pdflatex", "xelatex", "lualatex"] as const).map((comp) => (
                            <Select.Item key={comp} value={comp} className="relative flex items-center pl-8 pr-4 py-2 text-sm outline-none cursor-pointer hover:bg-[var(--quire-hover)] text-[var(--quire-text)] font-medium transition-colors">
                              <Select.ItemText>
                                {comp === "pdflatex" ? "pdfLaTeX" : comp === "xelatex" ? "XeLaTeX" : "LuaLaTeX"}
                              </Select.ItemText>
                              <Select.ItemIndicator className="absolute left-2.5 flex items-center justify-center">
                                <Check className="w-4 h-4 text-[var(--quire-text)]" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Main Document */}
                <div className="flex flex-col gap-2 p-3.5">
                  <label className="font-medium">Main Document</label>
                  <input 
                    type="text" 
                    className="w-full bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--quire-text)] shadow-sm transition-all font-mono text-[13px]"
                    value={project.rootFile}
                    onChange={(e) => onUpdate({ rootFile: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Behavior Section */}
            <div className="space-y-3">
              <label className="font-medium text-[var(--quire-text-secondary)] uppercase tracking-wider text-[11px]">Behavior</label>
              <div className="bg-[var(--quire-surface-secondary)] border border-[var(--quire-border)] rounded-xl overflow-hidden divide-y divide-[var(--quire-border)]">
                
                {/* Auto Compile */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex flex-col">
                    <label className="font-medium cursor-pointer" htmlFor="autoCompileToggle">Auto compile</label>
                    <span className="text-[11px] text-[var(--quire-muted)]">Compile automatically on save</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="autoCompileToggle"
                      type="checkbox" 
                      className="sr-only peer"
                      checked={project.autoCompile}
                      onChange={(e) => onUpdate({ autoCompile: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-[var(--quire-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--quire-text)] peer-checked:after:border-white shadow-inner"></div>
                  </label>
                </div>

                {/* SyncTeX */}
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex flex-col">
                    <label className="font-medium cursor-pointer" htmlFor="synctexToggle">SyncTeX</label>
                    <span className="text-[11px] text-[var(--quire-muted)]">Synchronize editor and PDF</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="synctexToggle"
                      type="checkbox" 
                      className="sr-only peer"
                      checked={project.synctex}
                      onChange={(e) => onUpdate({ synctex: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-[var(--quire-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--quire-text)] peer-checked:after:border-white shadow-inner"></div>
                  </label>
                </div>
                
              </div>
            </div>

          </div>
          
          <div className="mt-8 flex justify-end">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 bg-[var(--quire-text)] text-[var(--quire-surface)] rounded-lg font-medium hover:opacity-90 transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
