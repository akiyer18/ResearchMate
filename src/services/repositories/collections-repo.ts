import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { collections, paperCollections, paperSummaries } from "@/db/schema";
import { fuzzyScore } from "@/lib/fuzzy-match";

export type CollectionColor = "none" | "indigo" | "emerald" | "fuchsia" | "amber" | "cyan";

export type CollectionRecord = {
  id: string;
  project_id: string;
  name: string;
  color: CollectionColor;
  order_index: number;
  created_at: Date;
};

export type CollectionWithCount = CollectionRecord & { paper_count: number };

function toRecord(row: typeof collections.$inferSelect): CollectionRecord {
  return {
    id: row.id,
    project_id: row.projectId,
    name: row.name,
    color: (row.color as CollectionColor) ?? "none",
    order_index: row.orderIndex,
    created_at: row.createdAt,
  };
}

export const collectionsRepo = {
  async listByProject(project_id: string) {
    const rows = await db
      .select()
      .from(collections)
      .where(eq(collections.projectId, project_id))
      .orderBy(asc(collections.orderIndex), asc(collections.createdAt));
    return rows.map(toRecord);
  },

  async listByProjectWithCounts(project_id: string): Promise<CollectionWithCount[]> {
    const rows = await db
      .select({
        id: collections.id,
        userId: collections.userId,
        projectId: collections.projectId,
        name: collections.name,
        color: collections.color,
        orderIndex: collections.orderIndex,
        createdAt: collections.createdAt,
        paperCount: sql<number>`coalesce(count(${paperCollections.id}), 0)`,
      })
      .from(collections)
      .leftJoin(paperCollections, eq(paperCollections.collectionId, collections.id))
      .where(eq(collections.projectId, project_id))
      .groupBy(collections.id)
      .orderBy(asc(collections.orderIndex), asc(collections.createdAt));

    return rows.map((r) => ({
      ...toRecord({
        id: r.id,
        userId: r.userId,
        projectId: r.projectId,
        name: r.name,
        color: r.color,
        orderIndex: r.orderIndex,
        createdAt: r.createdAt,
      }),
      paper_count: Number(r.paperCount ?? 0),
    }));
  },

  async create(input: { project_id: string; name: string; color?: CollectionColor; user_id?: string }) {
    const userId = input.user_id ?? "local";
    const existing = await this.listByProject(input.project_id);
    const nextOrder = existing.length ? Math.max(...existing.map((c) => c.order_index)) + 1 : 0;
    const [row] = await db
      .insert(collections)
      .values({
        userId,
        projectId: input.project_id,
        name: input.name.trim(),
        color: input.color ?? "none",
        orderIndex: nextOrder,
      })
      .returning();
    return row ? toRecord(row) : null;
  },

  async rename(id: string, name: string) {
    const [row] = await db.update(collections).set({ name: name.trim() }).where(eq(collections.id, id)).returning();
    return row ? toRecord(row) : null;
  },

  async setColor(id: string, color: CollectionColor) {
    const [row] = await db.update(collections).set({ color }).where(eq(collections.id, id)).returning();
    return row ? toRecord(row) : null;
  },

  async reorder(project_id: string, ordered_ids: string[]) {
    const rows = await this.listByProject(project_id);
    const present = new Set(rows.map((r) => r.id));
    const ids = ordered_ids.filter((id) => present.has(id));
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(collections).set({ orderIndex: i }).where(eq(collections.id, ids[i]));
      }
    });
    return await this.listByProjectWithCounts(project_id);
  },

  async delete(id: string) {
    // paper_collections cascades via FK
    const [row] = await db.delete(collections).where(eq(collections.id, id)).returning();
    return row ? toRecord(row) : null;
  },

  async merge(input: { project_id: string; from_ids: string[]; into_id: string; delete_sources?: boolean }) {
    const fromIds = [...new Set(input.from_ids)].filter((x) => x !== input.into_id);
    if (!fromIds.length) return { moved: 0 };
    const del = input.delete_sources ?? true;

    const rows = await db
      .select({ paperId: paperCollections.paperId, collectionId: paperCollections.collectionId })
      .from(paperCollections)
      .where(inArray(paperCollections.collectionId, fromIds));

    const uniquePaperIds = [...new Set(rows.map((r) => r.paperId))];
    let moved = 0;

    await db.transaction(async (tx) => {
      for (const paperId of uniquePaperIds) {
        // insert mapping to into_id (ignore if already exists)
        await tx
          .insert(paperCollections)
          .values({
            userId: "local",
            paperId,
            collectionId: input.into_id,
          })
          .onConflictDoNothing();
        moved++;
      }

      await tx.delete(paperCollections).where(inArray(paperCollections.collectionId, fromIds));
      if (del) await tx.delete(collections).where(inArray(collections.id, fromIds));
    });

    return { moved };
  },

  async listAssignmentsForProject(project_id: string) {
    const rows = await db
      .select({
        paperId: paperCollections.paperId,
        collectionId: paperCollections.collectionId,
      })
      .from(paperCollections)
      .innerJoin(collections, eq(collections.id, paperCollections.collectionId))
      .where(eq(collections.projectId, project_id));

    const map = new Map<string, string[]>();
    for (const r of rows) {
      const cur = map.get(r.paperId) ?? [];
      cur.push(r.collectionId);
      map.set(r.paperId, cur);
    }
    return map;
  },

  async setPaperCollections(input: {
    paper_id: string;
    project_id: string;
    collection_ids: string[];
    multi_assign?: boolean;
  }) {
    const multi = input.multi_assign ?? false;
    const ids = [...new Set(input.collection_ids)].filter(Boolean);
    const keep = multi ? ids : ids.slice(0, 1);

    // Ensure the collections belong to the project.
    const allowed = await db
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.projectId, input.project_id), inArray(collections.id, keep)));
    const allowedIds = new Set(allowed.map((x) => x.id));
    const finalIds = keep.filter((id) => allowedIds.has(id));

    await db.transaction(async (tx) => {
      // Remove all existing mappings for this paper within this project.
      const inProject = await tx
        .select({ id: paperCollections.id })
        .from(paperCollections)
        .innerJoin(collections, eq(collections.id, paperCollections.collectionId))
        .where(and(eq(paperCollections.paperId, input.paper_id), eq(collections.projectId, input.project_id)));

      if (inProject.length) {
        await tx.delete(paperCollections).where(inArray(paperCollections.id, inProject.map((r) => r.id)));
      }

      if (finalIds.length) {
        await tx
          .insert(paperCollections)
          .values(
            finalIds.map((collectionId) => ({
              userId: "local",
              paperId: input.paper_id,
              collectionId,
            }))
          )
          .onConflictDoNothing();
      }
    });

    return finalIds;
  },

  async bulkAssign(input: {
    project_id: string;
    paper_ids: string[];
    collection_id: string | null;
    mode: "replace" | "add" | "remove";
  }) {
    const paperIds = [...new Set(input.paper_ids)].filter(Boolean).slice(0, 300);
    if (!paperIds.length) return { updated: 0 };

    if (input.collection_id === null) {
      // Clear all assignments for these papers within the project.
      await db.transaction(async (tx) => {
        const ids = await tx
          .select({ id: paperCollections.id })
          .from(paperCollections)
          .innerJoin(collections, eq(collections.id, paperCollections.collectionId))
          .where(and(eq(collections.projectId, input.project_id), inArray(paperCollections.paperId, paperIds)));
        if (ids.length) await tx.delete(paperCollections).where(inArray(paperCollections.id, ids.map((x) => x.id)));
      });
      return { updated: paperIds.length };
    }

    // Validate collection belongs to project.
    const col = await db.query.collections.findFirst({
      where: (t, { eq }) => eq(t.id, input.collection_id!),
    });
    if (!col || col.projectId !== input.project_id) return { updated: 0 };

    if (input.mode === "replace") {
      for (const paperId of paperIds) {
        await this.setPaperCollections({
          paper_id: paperId,
          project_id: input.project_id,
          collection_ids: [input.collection_id],
          multi_assign: false,
        });
      }
      return { updated: paperIds.length };
    }

    if (input.mode === "add") {
      await db
        .insert(paperCollections)
        .values(paperIds.map((paperId) => ({ userId: "local", paperId, collectionId: input.collection_id! })))
        .onConflictDoNothing();
      return { updated: paperIds.length };
    }

    // remove
    await db
      .delete(paperCollections)
      .where(and(eq(paperCollections.collectionId, input.collection_id), inArray(paperCollections.paperId, paperIds)));
    return { updated: paperIds.length };
  },

  async suggestCollections(input: { project_id: string; paper_id: string; limit?: number }) {
    const lim = Math.min(Math.max(input.limit ?? 3, 1), 8);
    const [paper, cols] = await Promise.all([
      db.query.paperSummaries.findFirst({ where: (t, { eq }) => eq(t.id, input.paper_id) }),
      this.listByProject(input.project_id),
    ]);
    if (!paper || !cols.length) return [];

    const text = `${paper.paperTitle}\n${paper.executiveSummary}\n${paper.userTopicTag}\n${paper.keywords}`;
    const scored = cols
      .map((c) => ({ c, s: fuzzyScore(c.name, text) + fuzzyScore(text, c.name) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, lim);
    return scored.map((x) => ({ id: x.c.id, name: x.c.name, color: x.c.color, score: x.s }));
  },

  async countUnassignedInProject(project_id: string) {
    // Papers with project_id but no row in paper_collections for that project.
    const rows = await db
      .select({ c: sql<number>`count(*)` })
      .from(paperSummaries)
      .where(eq(paperSummaries.projectId, project_id));

    const assigned = await db
      .selectDistinct({ paperId: paperCollections.paperId })
      .from(paperCollections)
      .innerJoin(collections, eq(collections.id, paperCollections.collectionId))
      .where(eq(collections.projectId, project_id));

    const total = Number(rows[0]?.c ?? 0);
    const assignedCount = assigned.length;
    return Math.max(0, total - assignedCount);
  },
};

