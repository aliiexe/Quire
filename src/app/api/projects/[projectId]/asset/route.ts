import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import path from "path";
import { z } from "zod";

const projectPathSchema = z.string()
  .trim()
  .min(1)
  .max(260)
  .refine((value) => !value.startsWith("/") && !value.startsWith("\\"), "Use a path inside this project")
  .refine((value) => value.split(/[\\/]+/).every((part) => part && part !== "." && part !== ".." && !part.startsWith(".")), "Invalid asset path");

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const parsedPath = projectPathSchema.safeParse(new URL(request.url).searchParams.get("path"));
  if (!parsedPath.success) {
    return NextResponse.json({ error: "A valid asset path is required" }, { status: 400 });
  }

  try {
    const bytes = await storage.readBinaryFile((await params).projectId, parsedPath.data);
    const filename = path.basename(parsedPath.data);
    const extension = path.extname(filename).toLowerCase();
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "ENOENT") return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the asset" }, { status: 500 });
  }
}
