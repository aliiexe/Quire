import { LatexDiagnostic } from "./compiler";

export function parseDiagnostics(log: string): LatexDiagnostic[] {
  const diagnostics: LatexDiagnostic[] = [];
  const lines = log.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match file-line-error format: filename:line: Error message
    const match = line.match(/^(.+?):(\d+):\s*(.*)$/);
    if (match) {
      const file = match[1];
      const lineNum = parseInt(match[2], 10);
      let message = match[3];
      
      // Sometimes the actual error detail is on the next lines
      let j = i + 1;
      while (j < lines.length && !lines[j].match(/^(.+?):(\d+):\s*(.*)$/) && lines[j].trim() !== '') {
        message += '\n' + lines[j].trim();
        j++;
      }
      
      const isWarning = message.toLowerCase().includes("warning");
      
      diagnostics.push({
        severity: isWarning ? "warning" : "error",
        file: pathBasename(file),
        line: lineNum,
        message: message,
        raw: match[0]
      });
    }
  }
  
  return diagnostics;
}

function pathBasename(p: string) {
  return p.split(/[\\\\/]/).pop() || p;
}
