import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { recentActivity } from "@/db/schema";

export type ActivityKind = "paper" | "project" | "scanner" | "note";

export type ActivityInput = {
  user_id?: string;
  kind: ActivityKind;
  entity_id: string;
  label: string;
  href: string;
  meta?: Record<string, unknown>;
};

export const activityRepo = {
  async touch(input: ActivityInput) {
    const userId = input.user_id ?? "local";
    const meta = JSON.stringify(input.meta ?? {});
    const now = new Date();

    await db
      .insert(recentActivity)
      .values({
        userId,
        kind: input.kind,
        entityId: input.entity_id,
        label: input.label,
        href: input.href,
        meta,
        lastActiveAt: now,
      })
      .onConflictDoUpdate({
        target: [
          recentActivity.userId,
          recentActivity.kind,
          recentActivity.entityId,
        ],
        set: {
          label: input.label,
          href: input.href,
          meta,
          lastActiveAt: now,
        },
      });
  },

  async listRecent(user_id = "local", limit = 12) {
    const rows = await db.query.recentActivity.findMany({
      where: (t, { eq }) => eq(t.userId, user_id),
      orderBy: (t, { desc }) => [desc(t.lastActiveAt)],
      limit: Math.min(Math.max(limit, 1), 30),
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as ActivityKind,
      entity_id: r.entityId,
      label: r.label,
      href: r.href,
      meta: safeMeta(r.meta),
      last_active_at: r.lastActiveAt,
    }));
  },
};

function safeMeta(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
