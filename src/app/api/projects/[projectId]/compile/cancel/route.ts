import { NextResponse } from "next/server";
import { compiler } from "@/lib/compiler/latexmk";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await compiler.cancel((await params).projectId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
