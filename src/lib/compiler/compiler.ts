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
  rootFile: string;
  compiler: "pdflatex" | "xelatex" | "lualatex";
  synctex: boolean;
}

export interface LatexCompiler {
  compile(input: CompileRequest): Promise<CompileResult>;
  cancel(projectId: string): Promise<void>;
}
