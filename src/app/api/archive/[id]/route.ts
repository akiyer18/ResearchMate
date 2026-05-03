import { NextResponse } from "next/server";
import { z } from "zod";

import { activityRepo } from "@/services/repositories/activity-repo";
import { paperRepo } from "@/services/repositories/paper-repo";

const PatchSchema = z.object({
  user_notes: z.string().optional(),
  user_topic_tag: z.string().optional(),
  reason_for_reading: z.string().optional(),
  structured_notes: z
    .object({
      idea: z.string().optional(),
      critique: z.string().optional(),
      use_in_project: z.string().optional(),
      open_questions: z.string().optional(),
      follow_up_tasks: z.string().optional(),
    })
    .optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = await paperRepo.getSummary(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await paperRepo.touchLastOpened(id);
  await activityRepo.touch({
    kind: "paper",
    entity_id: id,
    label: item.paper_title,
    href: `/research/archive/${id}`,
    meta: { source_type: item.source_type },
  });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await paperRepo.updateSummaryNotes(id, {
    user_notes: body.data.user_notes,
    user_topic_tag: body.data.user_topic_tag,
    reason_for_reading: body.data.reason_for_reading,
    structured_notes: body.data.structured_notes,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const deleted = await paperRepo.deleteSummary(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, deleted_id: id });
}

