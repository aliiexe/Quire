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
      compiler: "pdflatex",
      autoCompile: true,
      autoCompileDelayMs: 800,
      synctex: true
    };
    
    // Write config
    await fs.writeFile(
      this.getProjectConfigPath(projectId), 
      JSON.stringify(project, null, 2)
    );
    
    // Write template
    if (input.template !== "blank") {
      const mainTex = `\\documentclass{article}

\\usepackage[utf8]{inputenc}
\\usepackage{graphicx}
\\usepackage{amsmath}

\\title{Untitled Document}
\\author{}
\\date{}

\\begin{document}

\\maketitle

\\section{Introduction}

Start writing here.

\\end{document}
`;
      await fs.writeFile(path.join(projectPath, "main.tex"), mainTex);
    }
    
    return project;
  }

  async getProject(projectId: string): Promise<Project> {
    const configPath = this.getProjectConfigPath(projectId);
    const content = await fs.readFile(configPath, "utf-8");
    const project = JSON.parse(content) as Project;
    // ensure id is set correctly
    project.id = projectId;
    return project;
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

  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const targetPath = getSafePath(projectPath, filePath);
    
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf-8");
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
    
    await fs.mkdir(targetPath, { recursive: true });
  }

  async rename(projectId: string, from: string, to: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const fromPath = getSafePath(projectPath, from);
    const toPath = getSafePath(projectPath, to);
    
    await fs.rename(fromPath, toPath);
  }

  async remove(projectId: string, targetPath: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    const fullPath = getSafePath(projectPath, targetPath);
    
    await fs.rm(fullPath, { recursive: true, force: true });
  }
}

export const storage = new LocalProjectStorage();
