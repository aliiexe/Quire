<div align="center">
  <img src="public/brand/quire-wordmark-light.png" alt="Quire Logo" width="200" />
</div>

<br />

> Quire is a modern, local-first workspace for writing and compiling LaTeX documents.

Quire is designed for users who want the power and simplicity of a web-based LaTeX editor (like Overleaf) but prefer to run everything locally without arbitrary compile quotas or cloud dependencies.

## Features

- **Local-First Architecture:** Projects are stored directly on your hard drive inside your `workspace`. No database or authentication required.
- **Modern Interface:** A calm, clean, editorial interface that stays out of your way.
- **LaTeX Compiler Integration:** Compiles automatically as you save using `pdflatex`, `xelatex`, or `lualatex`.
- **Intelligent Diagnostics:** Parsed `file-line-error` diagnostics shown instantly in the UI.
- **Built-in PDF Preview:** Split pane with a lightning-fast PDF.js preview that syncs to your latest successful build.

## Requirements

1. **Node.js 18+**
2. **TeX Live or MacTeX** installed on your system.
3. The `latexmk` command line utility (included in most LaTeX distributions).

## Installation & Setup

1. **Clone the repository** and install dependencies:
   \`\`\`bash
   git clone https://github.com/your-username/quire.git
   cd quire
   npm install
   \`\`\`

2. **Verify your LaTeX environment:**
   Quire includes a diagnostic script to check your local compiler availability.
   \`\`\`bash
   npm run doctor
   \`\`\`

3. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   Navigate to [http://localhost:3000](http://localhost:3000)

## Keyboard Shortcuts

| Command          | Shortcut          |
|------------------|-------------------|
| Quick Open File  | \`Cmd/Ctrl + P\`  |
| Save             | \`Cmd/Ctrl + S\`  |
| Force Compile    | \`Cmd/Ctrl + Enter\` |

## Environment Variables

Check `.env.example` to customize the workspace.

\`\`\`env
QUIRE_WORKSPACE=/Users/yourname/Documents/QuireWorkspace
QUIRE_COMPILE_TIMEOUT_MS=60000
QUIRE_MAX_UPLOAD_MB=25
\`\`\`

## Architecture

Quire uses a three-tier design for future expandability:
1. **Next.js UI:** React/Tailwind frontend, heavily reliant on Zustand for application state and CodeMirror 6 for editing.
2. **Project Storage Abstraction:** Local files are mapped through a `LocalProjectStorage` abstraction using Node's `fs`, protecting against path-traversals.
3. **Compiler Daemon:** A spawned Node.js process manager interfacing safely with `latexmk` avoiding direct shell command construction.

## Security

Please see [SECURITY.md](SECURITY.md) for detailed notes on local and remote execution safety, path-traversal prevention, and our threat model.
