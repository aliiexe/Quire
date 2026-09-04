import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";

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
