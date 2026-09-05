import fs from "fs/promises";
import path from "path";
import { 
  ProjectStorage, 
  ProjectSummary, 
  Project, 
  CreateProjectInput, 
  ProjectNode, 
  FileContent 
} from "./storage";
import { getSafePath } from "./safe-path";

const DEFAULT_WORKSPACE = process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace");

export class LocalProjectStorage implements ProjectStorage {
  private workspacePath: string;

  constructor(workspacePath: string = DEFAULT_WORKSPACE) {
    this.workspacePath = workspacePath;
  }

  async ensureWorkspace(): Promise<void> {
    await fs.mkdir(this.workspacePath, { recursive: true });
  }

  private getProjectPath(projectId: string): string {
    return getSafePath(this.workspacePath, projectId);
  }

  private getQuireDir(projectId: string): string {
    return path.join(this.getProjectPath(projectId), ".quire");
  }

  private getProjectConfigPath(projectId: string): string {
    return path.join(this.getQuireDir(projectId), "project.json");
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await this.ensureWorkspace();
    const entries = await fs.readdir(this.workspacePath, { withFileTypes: true });
    
    const projects: ProjectSummary[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const configPath = path.join(this.workspacePath, entry.name, ".quire", "project.json");
          const stat = await fs.stat(configPath);
          const configContent = await fs.readFile(configPath, "utf-8");
          const config = JSON.parse(configContent);
          
          projects.push({
            id: entry.name,
            name: config.name || entry.name,
            lastModified: stat.mtimeMs,
            path: path.join(this.workspacePath, entry.name)
          });
        } catch (e) {
          // Not a valid quire project
        }
      }
    }
    
    return projects.sort((a, b) => b.lastModified - a.lastModified);
  }

  async removeProject(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    await fs.rm(projectPath, { recursive: true, force: false });
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    await this.ensureWorkspace();
    
    // Generate a simple ID based on name
    const projectId = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `project-${Date.now()}`;
    const projectPath = this.getProjectPath(projectId);
    
    // Check if exists
    try {
      await fs.stat(projectPath);
      throw new Error(`Project ${projectId} already exists`);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
    
    // Create structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(this.getQuireDir(projectId), { recursive: true });
    await fs.mkdir(path.join(this.getQuireDir(projectId), "build"), { recursive: true });
    
    const project: Project = {
      id: projectId,
      name: input.name,
      rootFile: "main.tex",
      compiler: input.compiler ?? "pdflatex",
      autoSave: true,
      autoCompile: input.autoCompile ?? true,
      autoCompileDelayMs: 800,
      synctex: input.synctex ?? true
    };
    
    // Write config
    await fs.writeFile(
      this.getProjectConfigPath(projectId), 
      JSON.stringify(project, null, 2)
    );
    
    // Every new project starts with a usable source file, including a blank document.
    const documentClass = input.template === "report" ? "report" : input.template === "thesis" ? "book" : "article";
    const title = input.template === "thesis" ? "Untitled Thesis" : input.template === "report" ? "Untitled Report" : "Untitled Document";
    const body = input.template === "blank"
      ? ""
      : input.template === "thesis"
        ? `\\chapter{Introduction}

Start writing here.
`
        : `\\section{Introduction}

Start writing here.
`;
    const mainTex = `\\documentclass{${documentClass}}

\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{amsmath}

\\title{${title}}
\\author{}
\\date{}

\\begin{document}

\\maketitle

${body}

\\end{document}
`;
    await fs.writeFile(path.join(projectPath, "main.tex"), mainTex);
    
    return project;
  }

  async getProject(projectId: string): Promise<Project> {
    const configPath = this.getProjectConfigPath(projectId);
    const content = await fs.readFile(configPath, "utf-8");
    const project = JSON.parse(content) as Project;
    // ensure id is set correctly
    project.id = projectId;
    // Projects created before auto-save became a separate preference retain
    // their original behavior: save automatically unless the writer opts out.
    if (typeof project.autoSave !== "boolean") project.autoSave = true;
    return project;
  }

  async updateProject(projectId: string, updates: Partial<Omit<Project, "id">>): Promise<Project> {
    const project = await this.getProject(projectId);
    const nextProject: Project = { ...project, ...updates, id: projectId };
    await fs.writeFile(this.getProjectConfigPath(projectId), JSON.stringify(nextProject, null, 2));
    return nextProject;
  }

  async listTree(projectId: string): Promise<ProjectNode[]> {
    const projectPath = this.getProjectPath(projectId);
    
    const walk = async (dir: string, relativeDir: string = ""): Promise<ProjectNode[]> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const nodes: ProjectNode[] = [];
      
      for (const entry of entries) {
        // Ignore .quire and other hidden folders
        if (entry.name.startsWith(".")) continue;
        
        const relPath = path.join(relativeDir, entry.name);
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: relPath,
            type: "directory",
            children: await walk(fullPath, relPath)
          });
        } else {
          nodes.push({
            name: entry.name,
            path: relPath,
            type: "file"
          });
        }
      }
      
      return nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "directory" ? -1 : 1;
      });
    };
    
    return walk(projectPath);
  }

  async readFile(projectId: string, filePath: string): Promise<FileContent> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    
    const content = await fs.readFile(targetPath, "utf-8");
    return { content };
  }

  async readBinaryFile(projectId: string, filePath: string): Promise<Uint8Array> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    return fs.readFile(targetPath);
  }

  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");
  }

  async writeBinaryFile(projectId: string, filePath: string, content: Uint8Array): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content);
  }

  async createFile(projectId: string, filePath: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    
    // Check if exists
    try {
      await fs.stat(targetPath);
      throw new Error("File already exists");
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
    
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, "");
  }

  async createDirectory(projectId: string, dirPath: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, dirPath);

    try {
      await fs.stat(targetPath);
      throw new Error("Folder already exists");
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.mkdir(targetPath);
  }

  async rename(projectId: string, from: string, to: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const fromPath = getSafePath(projectPath, from);
    const toPath = getSafePath(projectPath, to);
    
    await fs.rename(fromPath, toPath);
  }

  async move(projectId: string, from: string, destinationDirectory: string): Promise<string> {
    const projectPath = this.getProjectPath(projectId);
    const fromPath = getSafePath(projectPath, from);
    const destinationPath = getSafePath(projectPath, destinationDirectory);
    const relativeFrom = path.relative(projectPath, fromPath);
    const relativeDestination = path.relative(projectPath, destinationPath);

    if (relativeDestination === relativeFrom || relativeDestination.startsWith(`${relativeFrom}${path.sep}`)) {
      throw new Error("A folder cannot be moved into itself.");
    }

    const destinationStat = await fs.stat(destinationPath);
    if (!destinationStat.isDirectory()) throw new Error("Drop the item onto a folder.");

    const targetPath = path.join(destinationPath, path.basename(fromPath));
    if (targetPath === fromPath) throw new Error("That item is already in this folder.");
    try {
      await fs.stat(targetPath);
      throw new Error("That folder already contains an item with this name.");
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
        // The destination is free; continue with the move.
      } else if (error instanceof Error && error.message === "That folder already contains an item with this name.") {
        throw error;
      } else {
        throw error;
      }
    }

    await fs.rename(fromPath, targetPath);
    return path.relative(projectPath, targetPath);
  }

  async remove(projectId: string, targetPath: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const fullPath = getSafePath(projectPath, targetPath);
    
    await fs.rm(fullPath, { recursive: true, force: true });
  }
}

export const storage = new LocalProjectStorage();
