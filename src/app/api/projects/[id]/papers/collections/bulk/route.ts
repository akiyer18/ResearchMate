import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo } from "@/services/repositories/collections-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const BodySchema = z.object({
  paper_ids: z.array(z.string()).min(1),
  collection_id: z.string().nullable(),
  mode: z.enum(["replace", "add", "remove"]).default("replace"),
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

  const result = await collectionsRepo.bulkAssign({
    project_id: projectId,
    paper_ids: body.data.paper_ids,
    collection_id: body.data.collection_id,
    mode: body.data.mode,
  });

  return NextResponse.json({ ok: true, ...result });
}

