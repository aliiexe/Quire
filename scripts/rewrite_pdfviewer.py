with open('quire/src/components/preview/PDFViewer.tsx', 'r') as f:
    content = f.read()

# Update background
content = content.replace(
    'className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--quire-bg)] relative"',
    'className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--quire-pdf-bg)] relative transition-colors duration-150 ease-out"'
)

# Update toolbar
old_toolbar = """<div className="flex items-center gap-1.5 text-[13px]">
          <button 
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            className="px-2.5 py-1.5 rounded text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] disabled:opacity-30 transition-colors font-medium"
          >
            Prev
          </button>
          <span className="tabular-nums min-w-[3rem] text-center font-medium text-[var(--quire-muted)]">
            <span className="text-[var(--quire-text)]">{currentPage}</span> / {numPages || "?"}
          </span>
          <button 
            disabled={currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            className="px-2.5 py-1.5 rounded text-[var(--quire-muted)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] disabled:opacity-30 transition-colors font-medium"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center gap-1 text-[var(--quire-muted)]">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 rounded hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] transition-colors">
            <ZoomOut className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[13px] w-12 text-center tabular-nums font-medium">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.25))} className="p-1.5 rounded hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] transition-colors">
            <ZoomIn className="w-[18px] h-[18px]" />
          </button>
          <div className="w-px h-4 bg-[var(--quire-border)] mx-1" />
          <button onClick={() => setScale(1.0)} className="p-1.5 rounded hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] transition-colors" title="Fit Width">
            <Maximize className="w-[18px] h-[18px]" />
          </button>
          <div className="w-px h-4 bg-[var(--quire-border)] mx-1" />
          <button onClick={onDownload} className="p-1.5 rounded hover:text-[var(--quire-text)] hover:bg-[var(--quire-bg)] transition-colors" title="Download PDF">
            <Download className="w-[18px] h-[18px]" />
          </button>
        </div>"""

new_toolbar = """<div className="flex items-center gap-1.5 text-[12px] bg-[var(--quire-surface-secondary)] p-1 rounded-md border border-[var(--quire-border)] shadow-sm">
          <button 
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            className="px-2.5 py-1 rounded-sm text-[var(--quire-text-secondary)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] disabled:opacity-30 transition-all duration-150 ease-out font-medium"
          >
            Prev
          </button>
          <span className="tabular-nums min-w-[3rem] text-center font-medium text-[var(--quire-muted)]">
            <span className="text-[var(--quire-text)]">{currentPage}</span> / {numPages || "?"}
          </span>
          <button 
            disabled={currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            className="px-2.5 py-1 rounded-sm text-[var(--quire-text-secondary)] hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] disabled:opacity-30 transition-all duration-150 ease-out font-medium"
          >
            Next
          </button>
        </div>
        
        <div className="flex items-center gap-1 text-[var(--quire-muted)] bg-[var(--quire-surface-secondary)] p-1 rounded-md border border-[var(--quire-border)] shadow-sm">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[12px] w-10 text-center tabular-nums font-medium">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.25))} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          <button onClick={() => setScale(1.0)} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Fit Width">
            <Maximize className="w-4 h-4" />
          </button>
          <div className="w-px h-3 bg-[var(--quire-border)] mx-1" />
          <button onClick={onDownload} className="p-1 rounded-sm hover:text-[var(--quire-text)] hover:bg-[var(--quire-hover)] transition-all duration-150 ease-out" title="Download PDF">
            <Download className="w-4 h-4" />
          </button>
        </div>"""

content = content.replace(old_toolbar, new_toolbar)

# Update page shadow
content = content.replace(
    'className="relative bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-black/5"',
    'className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:ring-white/10 rounded-sm overflow-hidden"'
)

with open('quire/src/components/preview/PDFViewer.tsx', 'w') as f:
    f.write(content)
