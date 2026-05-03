import { NextResponse } from "next/server";
import { z } from "zod";

import { paperRepo } from "@/services/repositories/paper-repo";

const BodySchema = z.object({
  paper_summary_id: z.string().min(1),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const { paper_log, already_logged, reason } = await paperRepo.logExistingSummary({
    project_id: projectId,
    paper_summary_id: body.data.paper_summary_id,
  });

  if (!paper_log) {
    return NextResponse.json({ error: reason ?? "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    paper_log,
    already_logged: Boolean(already_logged),
  });
}

