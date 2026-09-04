import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import { z } from "zod";

const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  rootFile: z.string().min(1).optional(),
  compiler: z.enum(["pdflatex", "xelatex", "lualatex"]).optional(),
  autoCompile: z.boolean().optional(),
  autoCompileDelayMs: z.number().int().min(0).max(10000).optional(),
  synctex: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const project = await storage.getProject((await params).projectId);
    return NextResponse.json(project);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const result = projectUpdateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues }, { status: 400 });
    }

    const project = await storage.updateProject((await params).projectId, result.data);
    return NextResponse.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to update project settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
