import { desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db/client";
import { projectNotes } from "@/db/schema";

export type ProjectNoteRecord = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  note_type: string;
  tags: string[];
  paper_summary_id: string | null;
  created_at: Date;
  updated_at: Date;
};

function toRecord(row: typeof projectNotes.$inferSelect): ProjectNoteRecord {
  let tags: string[] = [];
  try {
    const t = JSON.parse(row.tags) as unknown;
    tags = Array.isArray(t) ? t.map(String) : [];
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    project_id: row.projectId,
    title: row.title,
    content: row.content,
    note_type: row.noteType,
    tags,
    paper_summary_id: row.paperSummaryId ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export const notesRepo = {
  async create(input: {
    project_id: string;
    title: string;
    content?: string;
    note_type?: string;
    tags?: string[];
    paper_summary_id?: string | null;
    user_id?: string;
  }) {
    const userId = input.user_id ?? "local";
    const [row] = await db
      .insert(projectNotes)
      .values({
        userId,
        projectId: input.project_id,
        title: input.title,
        content: input.content ?? "",
        noteType: input.note_type ?? "note",
        tags: JSON.stringify(input.tags ?? []),
        paperSummaryId: input.paper_summary_id ?? undefined,
      })
      .returning();
    return row ? toRecord(row) : null;
  },

  async listByProject(project_id: string, limit = 100) {
    const rows = await db.query.projectNotes.findMany({
      where: (t, { eq }) => eq(t.projectId, project_id),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
      limit: Math.min(Math.max(limit, 1), 200),
    });
    return rows.map(toRecord);
  },

  async searchAll(q: string, limit = 20) {
    const needle = `%${q.trim()}%`;
    const rows = await db
      .select()
      .from(projectNotes)
      .where(
        or(like(projectNotes.title, needle), like(projectNotes.content, needle))!
      )
      .orderBy(desc(projectNotes.updatedAt))
      .limit(Math.min(Math.max(limit, 1), 40));
    return rows.map(toRecord);
  },

  async get(id: string) {
    const row = await db.query.projectNotes.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return row ? toRecord(row) : null;
  },

  async update(
    id: string,
    input: { title?: string; content?: string; paper_summary_id?: string | null }
  ) {
    const patch: Partial<typeof projectNotes.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.content !== undefined) patch.content = input.content;
    if (input.paper_summary_id !== undefined) patch.paperSummaryId = input.paper_summary_id;
    const [row] = await db
      .update(projectNotes)
      .set(patch)
      .where(eq(projectNotes.id, id))
      .returning();
    return row ? toRecord(row) : null;
  },
};
