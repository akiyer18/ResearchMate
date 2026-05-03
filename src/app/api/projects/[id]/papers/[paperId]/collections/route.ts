import { NextResponse } from "next/server";
import { z } from "zod";

import { collectionsRepo } from "@/services/repositories/collections-repo";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const BodySchema = z.object({
  collection_ids: z.array(z.string()).optional().default([]),
  multi_assign: z.boolean().optional().default(false),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; paperId: string }> }) {
  const { id: projectId, paperId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const map = await collectionsRepo.listAssignmentsForProject(projectId);
  return NextResponse.json({ paper_id: paperId, collection_ids: map.get(paperId) ?? [] });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; paperId: string }> }) {
  const { id: projectId, paperId } = await ctx.params;
  try {
    const project = await projectRepo.get(projectId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const paper = await paperRepo.getSummary(paperId);
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    if (paper.project_id !== projectId) {
      return NextResponse.json(
        {
          error: "Paper not found in project",
          userMessage:
            "This paper isn’t saved inside this project. Assign collections from the project’s Papers tab, or scan it into the project first.",
        },
        { status: 409 }
      );
    }

    const body = BodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json(
        { error: "Invalid body", details: body.error.flatten() },
        { status: 400 }
      );
    }

    const collection_ids = await collectionsRepo.setPaperCollections({
      paper_id: paperId,
      project_id: projectId,
      collection_ids: body.data.collection_ids ?? [],
      multi_assign: body.data.multi_assign ?? false,
    });

    return NextResponse.json({ ok: true, paper_id: paperId, collection_ids });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such table") || msg.includes("no such column")) {
      return NextResponse.json(
        {
          error: "database_schema_outdated",
          userMessage: "Your SQLite file is missing tables for Collections. Run: npm run db:migrate",
        },
        { status: 503 }
      );
    }
    console.error("[PUT /api/projects/[id]/papers/[paperId]/collections]", e);
    return NextResponse.json(
      { error: "Internal server error", userMessage: "Could not update collections." },
      { status: 500 }
    );
  }
}

