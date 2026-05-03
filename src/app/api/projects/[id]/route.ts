import { NextResponse } from "next/server";
import { z } from "zod";

import { projectRepo } from "@/services/repositories/project-repo";

const PatchSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  project_type: z.enum(["thesis", "side_project", "survey", "implementation", "other"]).optional(),
  status: z.enum(["active", "paused", "complete", "planning"]).optional(),
  objective: z.string().optional(),
  thesis_direction: z.string().optional(),
  research_problem: z.string().optional(),
  research_questions: z.array(z.string()).optional(),
  hypothesis: z.string().nullable().optional(),
  methodology_direction: z.string().optional(),
  implementation_goal: z.string().optional(),
  target_outcome: z.string().optional(),
  deadline: z.string().nullable().optional(),
  primary_topics: z.array(z.string()).optional(),
  preferred_methods: z.array(z.string()).optional(),
  preferred_datasets: z.array(z.string()).optional(),
  preferred_metrics: z.array(z.string()).optional(),
  notes_summary: z.string().optional(),
  accent: z.enum(["indigo", "emerald", "fuchsia", "amber", "cyan"]).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = await projectRepo.get(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }
  const updated = await projectRepo.update(id, body.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

