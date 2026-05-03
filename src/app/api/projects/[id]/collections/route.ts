import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo, type CollectionColor } from "@/services/repositories/collections-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const CreateSchema = z.object({
  name: z.string().min(1),
  color: z.enum(["none", "indigo", "emerald", "fuchsia", "amber", "cyan"]).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const [items, unassigned] = await Promise.all([
    collectionsRepo.listByProjectWithCounts(projectId),
    collectionsRepo.countUnassignedInProject(projectId),
  ]);

  return NextResponse.json({ items, unassigned });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const created = await collectionsRepo.create({
    project_id: projectId,
    name: body.data.name,
    color: (body.data.color ?? "none") as CollectionColor,
  });

  if (!created) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  return NextResponse.json({ item: created });
}

