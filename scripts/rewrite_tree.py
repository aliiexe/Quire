with open('quire/src/components/explorer/ProjectTree.tsx', 'r') as f:
    content = f.read()

# Update tree item styling
content = content.replace(
    'className={`flex items-center gap-1.5 py-[5px] px-2 cursor-pointer select-none group relative transition-colors duration-[120ms]',
    'className={`flex items-center gap-2 h-[32px] px-2 cursor-pointer select-none group relative transition-all duration-150 ease-out'
)

content = content.replace(
    "${isSelected ? 'bg-[var(--quire-surface)] text-[var(--quire-text)]' : 'text-[var(--quire-muted)] hover:bg-[var(--quire-surface)] hover:text-[var(--quire-text)]'}",
    "${isSelected ? 'bg-[var(--quire-active-line)] text-[var(--quire-text)] font-medium' : 'text-[var(--quire-text-secondary)] hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]'}"
)

# Tiny red marker for active file
content = content.replace(
    '<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-[var(--quire-red)] rounded-r-full" />',
    '<div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-1 bg-[var(--quire-red)] rounded-full" />'
)

# Update dropdown styling
content = content.replace(
    'className="min-w-[160px] bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-md p-1 shadow-md z-50 text-sm text-[var(--quire-text)]"',
    'className="min-w-[160px] bg-[var(--quire-surface)] border border-[var(--quire-border)] rounded-[10px] p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 text-[13px] text-[var(--quire-text)] font-medium transition-all duration-150 ease-out"'
)

with open('quire/src/components/explorer/ProjectTree.tsx', 'w') as f:
    f.write(content)
