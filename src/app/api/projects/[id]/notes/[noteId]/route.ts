import { NextResponse } from "next/server";
import { z } from "zod";

import { activityRepo } from "@/services/repositories/activity-repo";
import { notesRepo } from "@/services/repositories/notes-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  paper_summary_id: z.string().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; noteId: string }> }) {
  const { id, noteId } = await ctx.params;
  const project = await projectRepo.get(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const existing = await notesRepo.get(noteId);
  if (!existing || existing.project_id !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await notesRepo.update(noteId, body.data);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await activityRepo.touch({
    kind: "note",
    entity_id: updated.id,
    label: updated.title,
    href: `/projects/${id}/notes`,
    meta: { project_id: id },
  });

  return NextResponse.json({ item: updated });
}
