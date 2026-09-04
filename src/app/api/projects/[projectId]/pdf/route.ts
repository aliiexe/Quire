import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import path from "path";
import fs from "fs/promises";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const project = await storage.getProject((await params).projectId);
    
    // Convert e.g., "main.tex" to "main.pdf"
    const pdfFilename = project.rootFile.replace(/\.tex$/, '.pdf');
    
    // We access the filesystem directly here for simplicity, although we should 
    // ideally add a getPdf() method to ProjectStorage for better abstraction.
    const DEFAULT_WORKSPACE = process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace");
    const projectPath = path.join(DEFAULT_WORKSPACE, (await params).projectId);
    const pdfPath = path.join(projectPath, ".quire", "build", pdfFilename);
    
    const fileBuffer = await fs.readFile(pdfPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Disposition": `inline; filename="${pdfFilename}"`,
      },
    });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
