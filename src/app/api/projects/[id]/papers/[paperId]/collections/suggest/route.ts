import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo } from "@/services/repositories/collections-repo";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const QuerySchema = z.object({
  limit: z.coerce.number().optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string; paperId: string }> }) {
  const { id: projectId, paperId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(req.url);
  const q = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!q.success) {
    return NextResponse.json(
      { error: "Invalid query", details: q.error.flatten() },
      { status: 400 }
    );
  }

  const paper = await paperRepo.getSummary(paperId);
  if (!paper || paper.project_id !== projectId) {
    return NextResponse.json({ error: "Paper not found in project" }, { status: 404 });
  }

  const items = await collectionsRepo.suggestCollections({
    project_id: projectId,
    paper_id: paperId,
    limit: q.data.limit,
  });

  return NextResponse.json({ items });
}

