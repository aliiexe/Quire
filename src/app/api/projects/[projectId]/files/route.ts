import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    
    if (!path) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }
    
    const file = await storage.readFile((await params).projectId, path);
    return NextResponse.json(file);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const writeSchema = z.object({
  content: z.string(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    
    if (!path) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }
    
    const body = await request.json();
    const result = writeSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues }, { status: 400 });
    }
    
    await storage.writeFile((await params).projectId, path, result.data.content);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
