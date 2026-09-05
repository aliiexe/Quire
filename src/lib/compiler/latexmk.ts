import { spawn, ChildProcess } from "child_process";
import path from "path";
import { LatexCompiler, CompileRequest, CompileResult, LatexDiagnostic } from "./compiler";
import { storage } from "@/lib/projects/local-storage";
import { parseDiagnostics } from "./diagnostics";
import fs from "fs/promises";
import fsSync from "fs";

function findWindowsLatexmk(): string | undefined {
  if (process.platform !== "win32") return undefined;

  const candidates: string[] = [];
  const addRoot = (root?: string) => {
    if (!root) return;
    candidates.push(
      path.join(root, "miktex", "bin", "x64", "latexmk.exe"),
      path.join(root, "miktex", "bin", "latexmk.exe"),
      path.join(root, "bin", "x64", "latexmk.exe"),
      path.join(root, "bin", "latexmk.exe"),
    );
  };

  const parents = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs"),
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
    process.env.ProgramData,
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
  ].filter((value): value is string => Boolean(value));

  for (const parent of parents) {
    try {
      for (const entry of fsSync.readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && /^miktex(?:\s|$)/i.test(entry.name)) addRoot(path.join(parent, entry.name));
      }
    } catch {
      // This is only a discovery convenience; PATH remains a valid fallback.
    }
  }

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function compilerCommand() {
  const discoveredWindowsCommand = findWindowsLatexmk();
  const configuredCommand = process.env.QUIRE_LATEXMK_COMMAND;
  if (discoveredWindowsCommand) return discoveredWindowsCommand;
  if (configuredCommand && (!path.isAbsolute(configuredCommand) || fsSync.existsSync(configuredCommand))) return configuredCommand;
  return process.platform === "win32" ? "latexmk.exe" : "latexmk";
}

function compilerEnvironment(command: string) {
  const inheritedPath = process.env.QUIRE_LATEX_PATH || process.env.Path || process.env.PATH || "";
  const commandPath = path.isAbsolute(command) ? path.dirname(command) : "";
  const searchPath = [commandPath, inheritedPath].filter(Boolean).join(path.delimiter);
  return {
    ...process.env,
    ...(searchPath ? { PATH: searchPath, Path: searchPath } : {}),
  };
}

export class LatexmkCompiler implements LatexCompiler {
  private activeProcesses = new Map<string, ChildProcess>();

  async compile(input: CompileRequest): Promise<CompileResult> {
    const taskId = input.taskId || input.projectId;
    // Cancel any existing compile for this exact workspace task. A temporary
    // Quire Draft preview must never interrupt the project's normal build.
    await this.cancel(taskId);

    const startTime = Date.now();
    const projectPath = input.projectPath ? path.resolve(input.projectPath) : getSafeProjectPath(input.projectId);
    const buildDir = path.join(projectPath, ".quire", "build");
    
    // Ensure build dir exists
    await fs.mkdir(buildDir, { recursive: true });

    return new Promise((resolve) => {
      const args = [
        "-pdf",
        "-interaction=nonstopmode",
        "-file-line-error",
        input.synctex ? "-synctex=1" : "-synctex=0",
        `-outdir=${buildDir}`,
      ];

      // Select engine
      if (input.compiler === "xelatex") {
        args.push("-xelatex");
      } else if (input.compiler === "lualatex") {
        args.push("-lualatex");
      }

      args.push(input.rootFile);

      const command = compilerCommand();
      const child = spawn(command, args, {
        cwd: projectPath,
        // The packaged Windows app starts its local server before a user may
        // install MiKTeX. Preserve Quire's explicitly discovered TeX path
        // rather than replacing it with whichever casing Windows happened to
        // give the inherited Path variable.
        env: compilerEnvironment(command),
        timeout: parseInt(process.env.QUIRE_COMPILE_TIMEOUT_MS || "60000", 10),
        windowsHide: true,
      });

      this.activeProcesses.set(taskId, child);

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => (stdout += data.toString()));
      child.stderr?.on("data", (data) => (stderr += data.toString()));

      child.on("close", async (code) => {
        this.activeProcesses.delete(taskId);
        
        const rawLog = stdout + "\\n" + stderr;
        const diagnostics = parseDiagnostics(rawLog);
        
        let success = code === 0;
        
        // DO NOT TRUST EXIT CODE ALONE
        // Verify the expected PDF exists and was modified recently
        const expectedPdfName = input.rootFile.replace(/\.tex$/, '.pdf');
        const pdfPath = path.join(buildDir, expectedPdfName);
        
        if (success) {
          try {
            await fs.stat(pdfPath);
          } catch (e) {
            success = false;
            diagnostics.push({
              severity: "error",
              message: "Expected PDF output was not found."
            });
          }
        }
        
        resolve({
          success,
          diagnostics,
          rawLog,
          durationMs: Date.now() - startTime
        });
      });

      child.on("error", (error) => {
        this.activeProcesses.delete(taskId);
        resolve({
          success: false,
          diagnostics: [{
            severity: "error",
            message: process.platform === "win32"
              ? "Quire could not start MiKTeX. Install MiKTeX, then choose Check again from Quire's home screen or restart Quire."
              : `Compiler process failed to start: ${error.message}`
          }],
          rawLog: error.message,
          durationMs: Date.now() - startTime
        });
      });
    });
  }

  async cancel(projectId: string): Promise<void> {
    const process = this.activeProcesses.get(projectId);
    if (process) {
      process.kill();
      this.activeProcesses.delete(projectId);
    }
  }
}

// Temporary safe path helper for internal use here
function getSafeProjectPath(projectId: string): string {
  const DEFAULT_WORKSPACE = process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace");
  const projectPath = path.join(DEFAULT_WORKSPACE, projectId);
  if (!projectPath.startsWith(path.resolve(DEFAULT_WORKSPACE))) {
    throw new Error("Invalid path");
  }
  return projectPath;
}

export const compiler = new LatexmkCompiler();
