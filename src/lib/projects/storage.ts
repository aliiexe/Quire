export interface ProjectSummary {
  id: string;
  name: string;
  lastModified: number;
  path: string;
}

export interface ProjectNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: ProjectNode[];
}

export interface CreateProjectInput {
  name: string;
  template?: "blank" | "article" | "report";
}

export interface Project {
  id: string;
  name: string;
  rootFile: string;
  compiler: "pdflatex" | "xelatex" | "lualatex";
  autoCompile: boolean;
  autoCompileDelayMs: number;
  synctex: boolean;
}

export interface FileContent {
  content: string;
}

export interface ProjectStorage {
  listProjects(): Promise<ProjectSummary[]>;
  createProject(input: CreateProjectInput): Promise<Project>;
  getProject(projectId: string): Promise<Project>;
  listTree(projectId: string): Promise<ProjectNode[]>;
  readFile(projectId: string, path: string): Promise<FileContent>;
  writeFile(projectId: string, path: string, content: string): Promise<void>;
  createFile(projectId: string, path: string): Promise<void>;
  createDirectory(projectId: string, path: string): Promise<void>;
  rename(projectId: string, from: string, to: string): Promise<void>;
  remove(projectId: string, path: string): Promise<void>;
}
