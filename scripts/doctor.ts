import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function checkCommand(command: string, label: string) {
  try {
    const output = execSync(`${command} --version`, { stdio: 'pipe' }).toString();
    console.log(`✅ ${label}: Found`);
    console.log(`   ${output.split('\\n')[0].trim()}`);
    return true;
  } catch (e) {
    console.log(`❌ ${label}: Not found`);
    return false;
  }
}

console.log("Quire System Doctor\\n");

console.log("Environment:");
console.log(`Node: ${process.version}`);
console.log(`Workspace: ${process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace")}`);
console.log("");

console.log("Compiler dependencies:");
const hasLatexmk = checkCommand("latexmk", "latexmk");
const hasPdfLatex = checkCommand("pdflatex", "pdfLaTeX");
const hasXeLatex = checkCommand("xelatex", "XeLaTeX");
const hasLuaLatex = checkCommand("lualatex", "LuaLaTeX");

console.log("");
if (!hasLatexmk) {
  console.log("⚠️  latexmk is REQUIRED. Please install TeX Live or MacTeX.");
} else if (!hasPdfLatex) {
  console.log("⚠️  pdflatex is REQUIRED. Please install TeX Live or MacTeX.");
} else {
  console.log("✅ Core LaTeX environment is ready.");
}
