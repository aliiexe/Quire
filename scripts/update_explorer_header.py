with open('quire/src/app/project/[projectId]/page.tsx', 'r') as f:
    content = f.read()

old_header = """<div className="p-2 border-b border-[var(--quire-border)] text-[11px] font-semibold text-[var(--quire-muted)] flex justify-between items-center tracking-wider h-9">
                <span>EXPLORER</span>
                <button onClick={toggleExplorer} className="p-1 hover:bg-[var(--quire-surface)] hover:text-[var(--quire-text)] rounded text-[var(--quire-muted)] transition-colors">
                  <Menu className="w-3.5 h-3.5" />
                </button>
              </div>"""

new_header = """<div className="px-3 py-2 border-b border-[var(--quire-border)] text-[11px] font-semibold text-[var(--quire-muted)] flex justify-between items-center h-9 group/explorerHeader">
                <span>Files</span>
                <button onClick={toggleExplorer} className="p-1 hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)] rounded text-[var(--quire-muted)] transition-all duration-150 ease-out opacity-0 group-hover/explorerHeader:opacity-100">
                  <Menu className="w-3.5 h-3.5" />
                </button>
              </div>"""

content = content.replace(old_header, new_header)

with open('quire/src/app/project/[projectId]/page.tsx', 'w') as f:
    f.write(content)
