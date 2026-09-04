import { NextResponse } from "next/server";
import { compiler } from "@/lib/compiler/latexmk";
import { storage } from "@/lib/projects/local-storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const project = await storage.getProject((await params).projectId);
    
    const result = await compiler.compile({
      projectId: (await params).projectId,
      rootFile: project.rootFile,
      compiler: project.compiler,
      synctex: project.synctex
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
