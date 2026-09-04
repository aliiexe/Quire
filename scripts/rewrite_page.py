import re

with open('quire/src/app/project/[projectId]/page.tsx', 'r') as f:
    content = f.read()

# Add Sun/Moon icons to imports
content = content.replace(
    'import { Play, Settings, Menu, Save, X } from "lucide-react";',
    'import { Play, Settings, Menu, Save, X, Sun, Moon, Monitor } from "lucide-react";'
)

# Update layout
header_start = content.find('<header')
header_end = content.find('</header>') + len('</header>')

new_header = """<header className="h-12 border-b border-[var(--quire-border)] bg-[var(--quire-surface)] flex items-center justify-between px-4 shrink-0 transition-colors duration-150 ease-out">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <QuireMark className="w-5 h-5 text-[var(--quire-text)]" />
          </Link>
          <div className="h-4 w-px bg-[var(--quire-border)] mx-1"></div>
          <span className="font-semibold text-[13px] tracking-tight">{project?.name || "Loading..."}</span>
          <span className="text-[11px] text-[var(--quire-muted)] flex items-center gap-1.5 ml-1">
            {isSaving ? "Saving..." : hasDirtyFiles ? (
              <><div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-muted)]"></div>Unsaved</>
            ) : "Saved"}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-[13px]">
          {/* Custom Auto-Compile Switch */}
          <label className="flex items-center gap-2 cursor-pointer text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors duration-150 ease-out">
            <span className="text-[12px] font-medium">Auto compile</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={project?.autoCompile || false} 
                onChange={(e) => setProject({ ...project!, autoCompile: e.target.checked })}
              />
              <div className="w-7 h-4 bg-[var(--quire-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--quire-text)] peer-checked:after:border-white"></div>
            </div>
          </label>
          
          {/* Recompile Button */}
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[var(--quire-text)] text-[var(--quire-surface)] rounded-md hover:bg-[var(--quire-text-secondary)] transition-all duration-150 ease-out min-w-[90px] justify-center shadow-sm"
            onClick={compileProject}
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

          <div className="h-4 w-px bg-[var(--quire-border)] mx-1"></div>
          
          <button 
            className="p-1.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-all duration-150 ease-out rounded-md hover:bg-[var(--quire-hover)]"
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
            className="p-1.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-all duration-150 ease-out rounded-md hover:bg-[var(--quire-hover)]"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>"""

content = content[:header_start] + new_header + content[header_end:]

# Update Tabs layout
tabs_start = content.find(' {/* Tabs */}')
tabs_end = content.find(' {/* Editor Content */}')

new_tabs = """{/* Tabs */}
              <div className="flex border-b border-[var(--quire-border)] bg-[var(--quire-surface-secondary)] overflow-x-auto shrink-0 scrollbar-hide h-9 transition-colors duration-150 ease-out">
                {openFiles.length === 0 ? (
                  <div className="px-4 py-2 text-[12px] text-[var(--quire-muted)] flex items-center">No open files</div>
                ) : (
                  openFiles.map(file => (
                    <div 
                      key={file}
                      className={`flex items-center gap-2 px-3 h-full text-[12px] cursor-pointer min-w-0 transition-all duration-150 ease-out relative group
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
                      {activeFile === file && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[var(--quire-border)]" />}
                    </div>
                  ))
                )}
              </div>"""

content = content[:tabs_start] + new_tabs + content[tabs_end:]

# Update root layout to read theme from localStorage on load if needed
# We'll just leave it and do it in layout.tsx if we want, but page.tsx is fine for now

with open('quire/src/app/project/[projectId]/page.tsx', 'w') as f:
    f.write(content)
