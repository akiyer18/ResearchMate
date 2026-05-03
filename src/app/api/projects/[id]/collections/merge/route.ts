import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo } from "@/services/repositories/collections-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const BodySchema = z.object({
  into_id: z.string().min(1),
  from_ids: z.array(z.string()).min(1),
  delete_sources: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const result = await collectionsRepo.merge({
    project_id: projectId,
    into_id: body.data.into_id,
    from_ids: body.data.from_ids,
    delete_sources: body.data.delete_sources,
  });

  const items = await collectionsRepo.listByProjectWithCounts(projectId);
  const unassigned = await collectionsRepo.countUnassignedInProject(projectId);
  return NextResponse.json({ ok: true, ...result, items, unassigned });
}

