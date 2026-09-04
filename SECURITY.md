# Security Constraints & Threat Model

Quire V1 is designed strictly as a local-first application. However, to prepare for future iterations involving cloud infrastructure, we enforce several security constraints early.

## 1. Directory Traversal Prevention

All filesystem paths generated dynamically or resolved from user inputs (such as paths for saving, loading, renaming, compiling, and downloading) go through a centralized `getSafePath` utility in `src/lib/projects/safe-path.ts`. 

This module enforces that paths cannot escape the current `QUIRE_WORKSPACE` directory using techniques like `../` or `%2e%2e`.

## 2. Compiler Isolation

In V1, the LaTeX compiler runs locally using `child_process.spawn`. 
- **Fixed executables:** We strictly constrain compilation commands to an enum-based selection (`pdflatex`, `xelatex`, `lualatex`).
- **No shell interpolation:** Arguments are passed as an array to `spawn()` to prevent shell interpolation. 
- **No shell escape:** The `-shell-escape` flag is disabled permanently for all local compilation jobs.
- **Timeouts:** A maximum process timeout (e.g., 60s) is enforced to prevent hanging compilers.

## 3. Future Cloud Architecture

If Quire is migrated to a public cloud application, compiling untrusted LaTeX poses extreme remote-code-execution (RCE) and denial-of-service (DoS) risks. A future version must ensure:
1. **Disposable Isolated Workers:** LaTeX compilation must happen in ephemeral, unprivileged Linux containers.
2. **No Network Access:** The compilation container must have network interfaces disabled.
3. **Resource Limits:** CPU time, RAM, and Disk space must be strictly cgroup-limited.
4. **No shell-escape:** `-shell-escape` must remain prohibited to prevent execution of arbitrary host commands.
