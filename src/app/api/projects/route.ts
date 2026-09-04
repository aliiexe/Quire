import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  template: z.enum(["blank", "article", "report", "thesis"]).optional().default("article"),
  compiler: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
  autoCompile: z.boolean().optional(),
  synctex: z.boolean().optional(),
});

export async function GET() {
  try {
    const projects = await storage.listProjects();
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createProjectSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues }, { status: 400 });
    }
    
    const project = await storage.createProject(result.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
