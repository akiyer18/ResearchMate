import { NextResponse } from "next/server";
import { z } from "zod";

import { activityRepo } from "@/services/repositories/activity-repo";
import { notesRepo } from "@/services/repositories/notes-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const PostSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().default(""),
  paper_summary_id: z.string().nullable().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await projectRepo.get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const items = await notesRepo.listByProject(id, 120);
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await projectRepo.get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = PostSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const created = await notesRepo.create({
    project_id: id,
    title: body.data.title,
    content: body.data.content,
    paper_summary_id: body.data.paper_summary_id ?? null,
  });
  if (!created) return NextResponse.json({ error: "Create failed" }, { status: 500 });

  await activityRepo.touch({
    kind: "note",
    entity_id: created.id,
    label: created.title,
    href: `/projects/${id}/notes`,
    meta: { project_id: id },
  });

  return NextResponse.json({ item: created });
}
