import re
import sys

with open('src/app/project/[projectId]/page.tsx', 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";',
    'import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, ImperativePanelHandle } from "react-resizable-panels";\nimport { useRef } from "react";'
)

content = content.replace(
    'const [showSettings, setShowSettings] = useState(false);',
    '''const [showSettings, setShowSettings] = useState(false);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const explorerPanelRef = useRef<ImperativePanelHandle>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem('quire:sidebar-collapsed');
    if (stored === 'true') {
      setIsExplorerCollapsed(true);
      // Panel ref might not be ready yet, we will set defaultSize/collapsed in the JSX.
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
  };'''
)

# 2. Auto-compile logic
old_auto_compile = '''  // Autosave & Auto-compile
  useEffect(() => {
    if (!project?.autoCompile) return;
    
    const timeoutIds: NodeJS.Timeout[] = [];
    let hasDirty = false;
    
    Object.keys(isDirty).forEach(path => {
      if (isDirty[path]) {
        hasDirty = true;
        const id = setTimeout(async () => {
          await saveFile(path);
        }, 1000);
        timeoutIds.push(id);
      }
    });

    if (hasDirty) {
      const compileId = setTimeout(() => {
        compileProject();
      }, 1500); // Compile after saves finish
      timeoutIds.push(compileId);
    }
    
    return () => timeoutIds.forEach(clearTimeout);
  }, [isDirty, fileContents, project, compileProject]);'''

new_auto_compile = '''  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const compileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave & Auto-compile
  useEffect(() => {
    if (!project?.autoCompile) return;
    
    const dirtyPaths = Object.keys(isDirty).filter(p => isDirty[p]);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (compileTimeoutRef.current) clearTimeout(compileTimeoutRef.current);

    if (dirtyPaths.length > 0) {
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        await Promise.all(dirtyPaths.map(async (path) => {
          try {
            await fetch(`/api/projects/${params.projectId}/files?path=${encodeURIComponent(path)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: fileContents[path] })
            });
            markSaved(path);
          } catch (e) {}
        }));
        setSaving(false);
        
        compileTimeoutRef.current = setTimeout(() => {
           compileProject();
        }, 700);
      }, 400);
    }
  }, [isDirty, fileContents, project?.autoCompile, compileProject, params.projectId, markSaved, setSaving]);'''

content = content.replace(old_auto_compile, new_auto_compile)

# 3. Top Bar
old_top_bar = '''      <header className="h-12 border-b border-[var(--quire-border)] bg-[var(--quire-surface)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <QuireMark className="w-6 h-6" />
          </Link>
          <div className="h-4 w-px bg-[var(--quire-border)]"></div>
          <span className="font-medium text-sm">{project?.name || "Loading..."}</span>
          <span className="text-xs text-[var(--quire-muted)] flex items-center gap-1.5">
            <Save className={`w-3.5 h-3.5 ${hasDirtyFiles ? "text-[var(--quire-text)]" : ""}`} />
            {isSaving ? "Saving..." : hasDirtyFiles ? "Unsaved" : "Saved"}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs flex items-center gap-2 cursor-pointer text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">
            <input type="checkbox" defaultChecked={project?.autoCompile} className="accent-[var(--quire-red)]" />
            Auto compile
          </label>
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--quire-text)] text-[var(--quire-surface)] rounded hover:opacity-90 transition-opacity"
            onClick={compileProject}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-red)] animate-pulse"></div>
                Compiling...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Recompile
              </>
            )}
          </button>
          <button 
            className="p-1.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors rounded"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>'''

new_top_bar = '''      <header className="h-12 border-b border-[var(--quire-border)] bg-[var(--quire-surface)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <QuireMark className="w-5 h-5" />
          </Link>
          <div className="h-4 w-px bg-[var(--quire-border)]"></div>
          <span className="font-medium text-[13px]">{project?.name || "Loading..."}</span>
          <span className="text-[11px] text-[var(--quire-muted)] flex items-center gap-1.5 ml-1">
            {isSaving ? "Saving..." : hasDirtyFiles ? (
              <><div className="w-1.5 h-1.5 rounded-full bg-[var(--quire-muted)]"></div>Unsaved</>
            ) : "Saved"}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-[13px]">
          <label className="flex items-center gap-2 cursor-pointer text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors">
            <input 
              type="checkbox" 
              defaultChecked={project?.autoCompile} 
              onChange={(e) => setProject({ ...project!, autoCompile: e.target.checked })}
              className="accent-[var(--quire-red)] w-3.5 h-3.5" 
            />
            Auto compile
          </label>
          <div className="h-4 w-px bg-[var(--quire-border)] mx-1"></div>
          <button 
            className="flex items-center gap-1.5 px-3 py-1.5 font-medium bg-[var(--quire-text)] text-[var(--quire-surface)] rounded hover:opacity-90 transition-opacity min-w-[100px] justify-center relative overflow-hidden"
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
                <Play className="w-3 h-3 fill-current" />
                Recompile
              </span>
            )}
          </button>
          <button 
            className="p-1.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] transition-colors rounded"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>'''

content = content.replace(old_top_bar, new_top_bar)

# 4. Project Explorer Panel
old_explorer = '''          <Panel defaultSize={20} minSize={15} collapsible className="bg-[var(--quire-bg)]">
            <div className="h-full flex flex-col border-r border-[var(--quire-border)]">
              <div className="p-2 border-b border-[var(--quire-border)] text-xs font-medium text-[var(--quire-muted)] flex justify-between items-center">
                <span>EXPLORER</span>
                <Menu className="w-3.5 h-3.5 cursor-pointer" />
              </div>
              <div className="p-2 overflow-auto">
                <ProjectTree 
                  nodes={tree} 
                  selectedPath={activeFile || ""} 
                  onSelect={handleSelectFile} 
                />
              </div>
            </div>
          </Panel>'''

new_explorer = '''          <Panel 
            ref={explorerPanelRef}
            defaultSize={20} 
            minSize={15}
            collapsible 
            collapsedSize={0}
            onCollapse={() => {
              setIsExplorerCollapsed(true);
              localStorage.setItem('quire:sidebar-collapsed', 'true');
            }}
            onExpand={() => {
              setIsExplorerCollapsed(false);
              localStorage.setItem('quire:sidebar-collapsed', 'false');
            }}
            className="bg-[var(--quire-bg)] transition-[flex-basis] duration-200 ease-in-out"
          >
            <div className="h-full flex flex-col border-r border-[var(--quire-border)] min-w-[200px]">
              <div className="p-2 border-b border-[var(--quire-border)] text-[11px] font-semibold text-[var(--quire-muted)] flex justify-between items-center tracking-wider h-9">
                <span>EXPLORER</span>
                <button onClick={toggleExplorer} className="p-1 hover:bg-[var(--quire-surface)] hover:text-[var(--quire-text)] rounded text-[var(--quire-muted)] transition-colors">
                  <Menu className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-2 overflow-auto">
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
            <div className="w-10 shrink-0 border-r border-[var(--quire-border)] bg-[var(--quire-bg)] flex flex-col items-center py-2 transition-all duration-200">
               <button onClick={toggleExplorer} className="p-1.5 hover:bg-[var(--quire-surface)] hover:text-[var(--quire-text)] rounded text-[var(--quire-muted)] transition-colors mt-0.5">
                  <Menu className="w-4 h-4" />
               </button>
            </div>
          )}'''

content = content.replace(old_explorer, new_explorer)

# 5. Editor Tabs
old_tabs = '''              <div className="flex border-b border-[var(--quire-border)] bg-[var(--quire-bg)] overflow-x-auto shrink-0 scrollbar-hide">
                {openFiles.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-[var(--quire-muted)] italic">No open files</div>
                ) : (
                  openFiles.map(file => (
                    <div 
                      key={file}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer border-r border-[var(--quire-border)] min-w-0
                        ${activeFile === file 
                          ? 'bg-[var(--quire-surface)] border-t-2 border-t-[var(--quire-text)] text-[var(--quire-text)]' 
                          : 'bg-[var(--quire-bg)] border-t-2 border-t-transparent text-[var(--quire-muted)] hover:bg-[var(--quire-surface)]'
                        }`}
                      onClick={() => setActiveFile(file)}
                    >
                      <span className="truncate max-w-[120px]">{file.split('/').pop()}</span>
                      {isDirty[file] && <span className="w-1.5 h-1.5 rounded-full bg-[var(--quire-text)] shrink-0"></span>}
                      <X 
                        className="w-3.5 h-3.5 text-[var(--quire-muted)] hover:text-[var(--quire-text)] ml-1 shrink-0" 
                        onClick={(e) => { e.stopPropagation(); closeFile(file); }}
                      />
                    </div>
                  ))
                )}
              </div>'''

new_tabs = '''              <div className="flex border-b border-[var(--quire-border)] bg-[var(--quire-bg)] overflow-x-auto shrink-0 scrollbar-hide h-9">
                {openFiles.length === 0 ? (
                  <div className="px-4 py-2 text-[13px] text-[var(--quire-muted)] italic flex items-center">No open files</div>
                ) : (
                  openFiles.map(file => (
                    <div 
                      key={file}
                      className={`flex items-center gap-2 px-3 h-full text-[13px] cursor-pointer border-r border-[var(--quire-border)] min-w-0 transition-colors
                        ${activeFile === file 
                          ? 'bg-[var(--quire-surface)] border-t-2 border-t-[var(--quire-text)] text-[var(--quire-text)]' 
                          : 'bg-[var(--quire-bg)] border-t-2 border-t-transparent text-[var(--quire-muted)] hover:bg-[var(--quire-surface)]'
                        }`}
                      onClick={() => setActiveFile(file)}
                    >
                      <span className="truncate max-w-[120px]">{file.split('/').pop()}</span>
                      {isDirty[file] && <span className="w-1.5 h-1.5 rounded-full bg-[var(--quire-text)] opacity-70 shrink-0"></span>}
                      <X 
                        className="w-3 h-3 text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-border)] rounded-sm ml-1 shrink-0 transition-colors p-0.5 box-content" 
                        onClick={(e) => { e.stopPropagation(); closeFile(file); }}
                      />
                    </div>
                  ))
                )}
              </div>'''

content = content.replace(old_tabs, new_tabs)

with open('src/app/project/[projectId]/page.tsx', 'w') as f:
    f.write(content)
