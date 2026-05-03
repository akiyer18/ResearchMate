import { NextResponse } from "next/server";
import { z } from "zod";

import { projectRepo } from "@/services/repositories/project-repo";

const CreateSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().default(""),
  project_type: z.enum(["thesis", "side_project", "survey", "implementation", "other"]).optional().default("thesis"),
  status: z.enum(["active", "paused", "complete", "planning"]).optional().default("active"),
  objective: z.string().optional().default(""),
  thesis_direction: z.string().optional().default(""),
  research_problem: z.string().optional().default(""),
  research_questions: z.array(z.string()).optional().default([]),
  hypothesis: z.string().nullable().optional().default(null),
  methodology_direction: z.string().optional().default(""),
  implementation_goal: z.string().optional().default(""),
  target_outcome: z.string().optional().default(""),
  deadline: z.string().nullable().optional().default(null),
  primary_topics: z.array(z.string()).optional().default([]),
  preferred_methods: z.array(z.string()).optional().default([]),
  preferred_datasets: z.array(z.string()).optional().default([]),
  preferred_metrics: z.array(z.string()).optional().default([]),
  notes_summary: z.string().optional().default(""),
  accent: z.enum(["indigo", "emerald", "fuchsia", "amber", "cyan"]).optional().default("indigo"),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const items = await projectRepo.list({ q });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }
  const created = await projectRepo.create(body.data);
  return NextResponse.json({ item: created });
}

