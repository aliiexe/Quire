import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import { z } from "zod";
import path from "path";

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: string }).code
    : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

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
  } catch (error: unknown) {
    if (getErrorCode(error) === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ error: getErrorMessage(error, "Unable to read the file") }, { status: 500 });
  }
}

const writeSchema = z.object({
  content: z.string(),
});

const projectPathSchema = z.string()
  .trim()
  .min(1, "A file name is required")
  .max(260, "The file path is too long")
  .refine((value) => !value.startsWith("/") && !value.startsWith("\\"), "Use a path inside this project")
  .refine((value) => value.split(/[\\/]+/).every((part) => part && part !== "." && part !== ".." && !part.startsWith(".")), "Hidden and parent folders cannot be changed here");

const createItemSchema = z.object({
  path: projectPathSchema,
  kind: z.enum(["file", "folder"]).default("file"),
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
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, "Unable to save the file") }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const upload = formData.get("file");
      if (!(upload instanceof File) || upload.size === 0) {
        return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
      }
      if (upload.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "Uploads must be 25 MB or smaller" }, { status: 413 });
      }

      const filename = path.basename(upload.name).trim();
      const parsedPath = projectPathSchema.safeParse(`assets/${filename}`);
      if (!parsedPath.success) {
        return NextResponse.json({ error: "That file name cannot be used in this project" }, { status: 400 });
      }

      const projectId = (await params).projectId;
      try {
        await storage.readBinaryFile(projectId, parsedPath.data);
        return NextResponse.json({ error: "A file with that name already exists in assets" }, { status: 409 });
      } catch (error: unknown) {
        const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
        if (code !== "ENOENT") throw error;
      }

      await storage.writeBinaryFile(projectId, parsedPath.data, new Uint8Array(await upload.arrayBuffer()));
      return NextResponse.json({ success: true, path: parsedPath.data, name: filename }, { status: 201 });
    }

    const result = createItemSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid project path" }, { status: 400 });
    }

    const projectId = (await params).projectId;
    if (result.data.kind === "folder") {
      await storage.createDirectory(projectId, result.data.path);
    } else {
      await storage.createFile(projectId, result.data.path);
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to create the item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const result = projectPathSchema.safeParse(new URL(request.url).searchParams.get("path"));
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid file path" }, { status: 400 });
    }

    await storage.remove((await params).projectId, result.data);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to delete the file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
