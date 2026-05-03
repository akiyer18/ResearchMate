import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo, type CollectionColor } from "@/services/repositories/collections-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.enum(["none", "indigo", "emerald", "fuchsia", "amber", "cyan"]).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id: projectId, collectionId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  let updated: any = null;
  if (body.data.name !== undefined) updated = await collectionsRepo.rename(collectionId, body.data.name);
  if (body.data.color !== undefined)
    updated = await collectionsRepo.setColor(collectionId, body.data.color as CollectionColor);

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id: projectId, collectionId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const deleted = await collectionsRepo.delete(collectionId);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, deleted_id: deleted.id });
}

