import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { projectWriting } from "@/db/schema";

export type ProjectWritingRecord = {
  id: string;
  project_id: string;
  body: string;
  lit_review_draft: string;
  lit_review_generated_at: Date | null;
  lit_review_source_hash: string;
  citation_style: string;
  updated_at: Date;
};

function toRecord(row: typeof projectWriting.$inferSelect): ProjectWritingRecord {
  return {
    id: row.id,
    project_id: row.projectId,
    body: row.body,
    lit_review_draft: row.litReviewDraft,
    lit_review_generated_at: row.litReviewGeneratedAt ?? null,
    lit_review_source_hash: row.litReviewSourceHash,
    citation_style: row.citationStyle,
    updated_at: row.updatedAt,
  };
}

export const writingRepo = {
  async getOrCreate(project_id: string, user_id = "local") {
    const existing = await db.query.projectWriting.findFirst({
      where: (t, { eq }) => eq(t.projectId, project_id),
    });
    if (existing) return toRecord(existing);

    const [row] = await db
      .insert(projectWriting)
      .values({
        userId: user_id,
        projectId: project_id,
      })
      .returning();
    return row ? toRecord(row) : null;
  },

  async update(
    project_id: string,
    input: {
      body?: string;
      lit_review_draft?: string;
      lit_review_generated_at?: Date | null;
      lit_review_source_hash?: string;
      citation_style?: string;
    }
  ) {
    const patch: Partial<typeof projectWriting.$inferInsert> = { updatedAt: new Date() };
    if (input.body !== undefined) patch.body = input.body;
    if (input.lit_review_draft !== undefined) patch.litReviewDraft = input.lit_review_draft;
    if (input.lit_review_generated_at !== undefined)
      patch.litReviewGeneratedAt = input.lit_review_generated_at;
    if (input.lit_review_source_hash !== undefined)
      patch.litReviewSourceHash = input.lit_review_source_hash;
    if (input.citation_style !== undefined) patch.citationStyle = input.citation_style;
    const [row] = await db
      .update(projectWriting)
      .set(patch)
      .where(eq(projectWriting.projectId, project_id))
      .returning();
    return row ? toRecord(row) : null;
  },
};
