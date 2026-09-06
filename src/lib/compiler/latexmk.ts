import { spawn, ChildProcess } from "child_process";
import path from "path";
import { LatexCompiler, CompileRequest, CompileResult, LatexDiagnostic } from "./compiler";
import { storage } from "@/lib/projects/local-storage";
import { parseDiagnostics } from "./diagnostics";
import fs from "fs/promises";
import fsSync from "fs";

type ProcessResult = {
  code: number | null;
  output: string;
};

// A user-install of MiKTeX can expose pdflatex.exe before its file-name
// database and format files have been created. Prepare it once per Quire
// server session, rather than leaving a first compilation to fail silently.
const preparedMiKTeXInstallations = new Map<string, Promise<string>>();

function findWindowsTexExecutable(executable: string): string | undefined {
  if (process.platform !== "win32") return undefined;

  const candidates: string[] = [];
  const addRoot = (root?: string) => {
    if (!root) return;
    candidates.push(
      path.join(root, "miktex", "bin", "x64", executable),
      path.join(root, "miktex", "bin", executable),
      path.join(root, "bin", "x64", executable),
      path.join(root, "bin", executable),
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

function latexmkCommand() {
  const configuredCommand = process.env.QUIRE_LATEXMK_COMMAND;
  if (configuredCommand && (!path.isAbsolute(configuredCommand) || fsSync.existsSync(configuredCommand))) return configuredCommand;
  return "latexmk";
}

function compilerCommand(compiler: CompileRequest["compiler"]) {
  const windowsEngine = compiler === "xelatex" ? "xelatex.exe" : compiler === "lualatex" ? "lualatex.exe" : "pdflatex.exe";
  const discoveredWindowsCommand = findWindowsTexExecutable(windowsEngine);
  const configuredCommand = process.env.QUIRE_LATEXMK_COMMAND;
  if (discoveredWindowsCommand) return discoveredWindowsCommand;
  if (process.platform === "win32") return windowsEngine;
  return configuredCommand && (!path.isAbsolute(configuredCommand) || fsSync.existsSync(configuredCommand)) ? configuredCommand : latexmkCommand();
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

function runProcess(command: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const finish = (result: ProcessResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let child: ChildProcess;
    try {
      child = spawn(command, args, { env, windowsHide: true });
    } catch (error) {
      finish({ code: null, output: error instanceof Error ? error.message : "Unable to start MiKTeX preparation." });
      return;
    }

    const timeout = setTimeout(() => {
      child.kill();
      finish({ code: null, output: "MiKTeX preparation timed out." });
    }, timeoutMs);

    child.stdout?.on("data", (data) => { output += data.toString(); });
    child.stderr?.on("data", (data) => { output += data.toString(); });
    child.once("error", (error) => {
      clearTimeout(timeout);
      finish({ code: null, output: `${output}\n${error.message}`.trim() });
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      finish({ code, output });
    });
  });
}

async function prepareWindowsMiKTeX(command: string, compiler: CompileRequest["compiler"]): Promise<string> {
  if (process.platform !== "win32" || !/miktex/i.test(command)) return "";

  const miktexCommand = path.join(path.dirname(command), "miktex.exe");
  if (!fsSync.existsSync(miktexCommand)) return "";

  const cacheKey = `${miktexCommand}:${compiler}`.toLowerCase();
  let preparation = preparedMiKTeXInstallations.get(cacheKey);
  if (!preparation) {
    preparation = (async () => {
      const environment = compilerEnvironment(command);
      // These are documented MiKTeX user-mode maintenance commands. They
      // initialise only the current user; Quire never requests admin access.
      const database = await runProcess(miktexCommand, ["--enable-installer", "fndb", "refresh"], environment, 45_000);
      const format = await runProcess(miktexCommand, ["--enable-installer", "formats", "build", compiler], environment, 45_000);
      const output = [database.output, format.output].filter(Boolean).join("\n").trim();
      if (database.code === 0 && format.code === 0) return output;
      return output || "MiKTeX could not complete its first-run preparation.";
    })();
    preparedMiKTeXInstallations.set(cacheKey, preparation);
  }

  return preparation;
}

async function readWindowsMiKTeXLog(command: string): Promise<string> {
  if (process.platform !== "win32" || !/miktex/i.test(command)) return "";

  const executable = path.basename(command, path.extname(command));
  const roots = [process.env.LOCALAPPDATA, process.env.APPDATA, process.env.ProgramData].filter((root): root is string => Boolean(root));
  const logPaths = roots.map((root) => path.join(root, "MiKTeX", "miktex", "log", `${executable}.log`));

  for (const logPath of logPaths) {
    try {
      const log = await fs.readFile(logPath, "utf8");
      const meaningful = log
        .split(/\r?\n/)
        .filter((line) => /\b(?:FATAL|ERROR|major issue)\b/i.test(line))
        .slice(-6)
        .join(" ")
        .replace(/\s+/g, " ")
        .slice(0, 900);
      if (meaningful) return `MiKTeX detail: ${meaningful}`;
    } catch {
      // MiKTeX creates this log only once it has started a compilation.
    }
  }

  return "";
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

    const command = compilerCommand(input.compiler);
    const preparationLog = await prepareWindowsMiKTeX(command, input.compiler);

    return new Promise((resolve) => {
      const useWindowsEngine = process.platform === "win32";
      const args = useWindowsEngine
        ? [
          "--enable-installer",
          "-interaction=nonstopmode",
          "-file-line-error",
          input.synctex ? "-synctex=1" : "-synctex=0",
          `-output-directory=${buildDir}`,
          input.rootFile,
        ]
        : [
          "-pdf",
          "-interaction=nonstopmode",
          "-file-line-error",
          input.synctex ? "-synctex=1" : "-synctex=0",
          `-outdir=${buildDir}`,
        ];

      if (!useWindowsEngine && input.compiler === "xelatex") args.push("-xelatex");
      else if (!useWindowsEngine && input.compiler === "lualatex") args.push("-lualatex");
      if (!useWindowsEngine) args.push(input.rootFile);

      const child = spawn(command, args, {
        cwd: projectPath,
        // On Windows we invoke the actual MiKTeX engine directly instead of
        // assuming latexmk was installed with it. This also finds a MiKTeX
        // installation added while Quire is already open.
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
        let success = code === 0;
        const miktexLog = !success ? await readWindowsMiKTeXLog(command) : "";
        const rawLog = [preparationLog, stdout, stderr, miktexLog].filter(Boolean).join("\n");
        const diagnostics = parseDiagnostics(rawLog);
        
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

        if (!success && !diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
          const detail = rawLog
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !/^this is |^entering extended mode/i.test(line))
            .slice(-4)
            .join(" ")
            .slice(0, 420);
          diagnostics.push({
            severity: "error",
            message: detail
              ? `Local compilation stopped: ${detail}`
              : "Local compilation stopped without returning a diagnostic. Confirm that your TeX installation can run pdfLaTeX, then try again.",
          });
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
        const executable = path.basename(command);
        resolve({
          success: false,
          diagnostics: [{
            severity: "error",
            message: process.platform === "win32"
              ? `Quire could not start ${executable}. Install or finish setting up MiKTeX, then return to the home screen and choose Check again. (${error.message})`
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
