import { NextResponse } from "next/server";
import { z } from "zod";
import { compileDraftPreview, discardDraftPreview, readDraftPreviewPdf } from "@/lib/projects/draft-preview";

const projectPathSchema = z.string()
  .trim()
  .min(1)
  .max(260)
  .refine((value) => !value.startsWith("/") && !value.startsWith("\\"), "Use a path inside this project")
  .refine((value) => value.split(/[\\/]+/).every((part) => part && part !== "." && part !== ".." && !part.startsWith(".")), "Invalid file path");

const previewSchema = z.object({
  token: z.string().uuid(),
  filePath: projectPathSchema,
  content: z.string().max(1_000_000),
});

function previewToken(request: Request) {
  return z.string().uuid().safeParse(new URL(request.url).searchParams.get("token"));
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const body = previewSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "A valid draft preview is required." }, { status: 400 });

  try {
    const result = await compileDraftPreview({ projectId: (await params).projectId, ...body.data });
    return NextResponse.json({ success: result.success, diagnostics: result.diagnostics, durationMs: result.durationMs });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Quire Draft could not compile this preview." }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const token = previewToken(request);
  if (!token.success) return NextResponse.json({ error: "A valid preview token is required." }, { status: 400 });

  try {
    const bytes = await readDraftPreviewPdf((await params).projectId, token.data);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store", "Content-Disposition": "inline; filename=Quire-Draft-preview.pdf" } });
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "ENOENT") return NextResponse.json({ error: "Draft preview PDF not found." }, { status: 404 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the draft preview." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const token = previewToken(request);
  if (!token.success) return NextResponse.json({ error: "A valid preview token is required." }, { status: 400 });

  try {
    await discardDraftPreview((await params).projectId, token.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to discard the draft preview." }, { status: 500 });
  }
}
