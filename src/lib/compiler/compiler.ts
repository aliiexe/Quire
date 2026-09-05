export type DiagnosticSeverity = "error" | "warning" | "info";

export interface LatexDiagnostic {
  severity: DiagnosticSeverity;
  file?: string;
  line?: number;
  column?: number;
  message: string;
  raw?: string;
}

export interface CompileResult {
  success: boolean;
  diagnostics: LatexDiagnostic[];
  rawLog: string;
  durationMs: number;
}

export interface CompileRequest {
  projectId: string;
  /** A private workspace copy used for a non-destructive proposal preview. */
  projectPath?: string;
  /** Keeps an isolated preview build from cancelling the writer's normal build. */
  taskId?: string;
  rootFile: string;
  compiler: "pdflatex" | "xelatex" | "lualatex";
  synctex: boolean;
}

export interface LatexCompiler {
  compile(input: CompileRequest): Promise<CompileResult>;
  cancel(projectId: string): Promise<void>;
}
