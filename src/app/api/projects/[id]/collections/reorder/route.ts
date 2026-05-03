import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo } from "@/services/repositories/collections-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const BodySchema = z.object({
  ordered_ids: z.array(z.string()).min(1),
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

  const items = await collectionsRepo.reorder(projectId, body.data.ordered_ids);
  return NextResponse.json({ items });
}

