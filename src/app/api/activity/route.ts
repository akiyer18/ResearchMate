import { NextResponse } from "next/server";
import { z } from "zod";

import { activityRepo } from "@/services/repositories/activity-repo";

const PostSchema = z.object({
  kind: z.enum(["paper", "project", "scanner", "note"]),
  entity_id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const items = await activityRepo.listRecent("local", 14);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = PostSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }
  await activityRepo.touch({
    kind: body.data.kind,
    entity_id: body.data.entity_id,
    label: body.data.label,
    href: body.data.href,
    meta: body.data.meta,
  });
  return NextResponse.json({ ok: true });
}
