import { NextResponse } from "next/server";
import { z } from "zod";

import { projectRepo } from "@/services/repositories/project-repo";
import { writingRepo } from "@/services/repositories/writing-repo";

const PatchSchema = z.object({
  body: z.string().optional(),
  lit_review_draft: z.string().optional(),
  citation_style: z.enum(["apa-lite", "mla-lite", "chi"]).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await projectRepo.get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const doc = await writingRepo.getOrCreate(id);
  if (!doc) return NextResponse.json({ error: "Could not load writing doc" }, { status: 500 });
  return NextResponse.json({ project_id: id, writing: doc });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await projectRepo.get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  await writingRepo.getOrCreate(id);
  const updated = await writingRepo.update(id, {
    body: body.data.body,
    lit_review_draft: body.data.lit_review_draft,
    citation_style: body.data.citation_style,
  });
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ writing: updated });
}
