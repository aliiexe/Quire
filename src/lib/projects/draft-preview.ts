import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { compiler } from "@/lib/compiler/latexmk";
import type { CompileResult } from "@/lib/compiler/compiler";
import { storage } from "@/lib/projects/local-storage";
import { getSafePath } from "@/lib/projects/safe-path";

const workspacePath = process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace");
const previewRoot = path.join(os.tmpdir(), "quire-draft-previews");
const previewTokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PreviewMetadata = {
  pdfPath: string;
  createdAt: number;
};

function assertPreviewToken(token: string) {
  if (!previewTokenPattern.test(token)) throw new Error("Invalid Quire Draft preview.");
}

function getProjectPath(projectId: string) {
  const projectPath = getSafePath(workspacePath, projectId);
  const relativePath = path.relative(path.resolve(workspacePath), projectPath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid project.");
  }
  return projectPath;
}

function getPreviewPath(projectId: string, token: string) {
  assertPreviewToken(token);
  return path.join(previewRoot, encodeURIComponent(projectId), token);
}

function shouldCopyProjectEntry(projectPath: string, source: string) {
  const relativePath = path.relative(projectPath, source);
  if (!relativePath) return true;
  return !relativePath.split(path.sep).some((part) => part === ".quire" || part === ".git" || part === "node_modules");
}

export async function compileDraftPreview(input: {
  projectId: string;
  token: string;
  filePath: string;
  content: string;
}): Promise<CompileResult> {
  const project = await storage.getProject(input.projectId);
  const sourceProjectPath = getProjectPath(input.projectId);
  const temporaryProjectPath = getPreviewPath(input.projectId, input.token);

  // The exact token path is private to this preview. Removing it first makes
  // retries deterministic without touching the writer's real workspace.
  await fs.rm(temporaryProjectPath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(temporaryProjectPath), { recursive: true });
  await fs.cp(sourceProjectPath, temporaryProjectPath, {
    recursive: true,
    filter: (source) => shouldCopyProjectEntry(sourceProjectPath, source),
  });

  const proposedFilePath = getSafePath(temporaryProjectPath, input.filePath);
  await fs.mkdir(path.dirname(proposedFilePath), { recursive: true });
  await fs.writeFile(proposedFilePath, input.content, "utf8");

  const result = await compiler.compile({
    projectId: input.projectId,
    taskId: `draft-preview:${input.projectId}:${input.token}`,
    projectPath: temporaryProjectPath,
    rootFile: project.rootFile,
    compiler: project.compiler,
    synctex: project.synctex,
  });

  if (result.success) {
    const pdfPath = path.join(temporaryProjectPath, ".quire", "build", project.rootFile.replace(/\.tex$/i, ".pdf"));
    const metadata: PreviewMetadata = { pdfPath: path.relative(temporaryProjectPath, pdfPath), createdAt: Date.now() };
    await fs.writeFile(path.join(temporaryProjectPath, "preview.json"), JSON.stringify(metadata), "utf8");
  }

  return result;
}

export async function readDraftPreviewPdf(projectId: string, token: string): Promise<Uint8Array> {
  const temporaryProjectPath = getPreviewPath(projectId, token);
  const metadata = JSON.parse(await fs.readFile(path.join(temporaryProjectPath, "preview.json"), "utf8")) as PreviewMetadata;
  if (!metadata?.pdfPath) throw new Error("The Quire Draft preview is not ready.");
  return fs.readFile(getSafePath(temporaryProjectPath, metadata.pdfPath));
}

export async function discardDraftPreview(projectId: string, token: string): Promise<void> {
  const temporaryProjectPath = getPreviewPath(projectId, token);
  // If the writer rejects while LaTeX is still running, stop only this
  // isolated task before removing its exact temporary directory.
  await compiler.cancel(`draft-preview:${projectId}:${token}`);
  await fs.rm(temporaryProjectPath, { recursive: true, force: true });
}
