import { desc, eq, like, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { projects } from "@/db/schema";
import type { ProjectRecord, ProjectStatus, ProjectType } from "@/types/projects";
import { decodeStringArray, encodeStringArray } from "@/services/storage/json-arrays";

function toRecord(row: typeof projects.$inferSelect): ProjectRecord {
  return {
    id: row.id,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    user_id: row.userId,

    title: row.title,
    slug: row.slug,
    description: row.description,
    project_type: row.projectType as ProjectType,
    status: row.status as ProjectStatus,

    objective: row.objective,
    thesis_direction: row.thesisDirection,
    research_problem: row.researchProblem,
    research_questions: decodeStringArray(row.researchQuestions),
    hypothesis: row.hypothesis ?? null,
    methodology_direction: row.methodologyDirection,
    implementation_goal: row.implementationGoal,
    target_outcome: row.targetOutcome,
    deadline: row.deadline ?? null,

    primary_topics: decodeStringArray(row.primaryTopics),
    preferred_methods: decodeStringArray(row.preferredMethods),
    preferred_datasets: decodeStringArray(row.preferredDatasets),
    preferred_metrics: decodeStringArray(row.preferredMetrics),
    notes_summary: row.notesSummary,

    accent: (row.accent as ProjectRecord["accent"]) ?? "indigo",
  };
}

export type CreateProjectInput = Omit<ProjectRecord, "id" | "created_at" | "updated_at" | "user_id"> & {
  user_id?: string;
};

export const projectRepo = {
  async create(input: CreateProjectInput) {
    const userId = input.user_id ?? "local";
    const [row] = await db
      .insert(projects)
      .values({
        userId,
        title: input.title,
        slug: input.slug,
        description: input.description ?? "",
        projectType: input.project_type,
        status: input.status,

        objective: input.objective ?? "",
        thesisDirection: input.thesis_direction ?? "",
        researchProblem: input.research_problem ?? "",
        researchQuestions: encodeStringArray(input.research_questions ?? []),
        hypothesis: input.hypothesis ?? undefined,
        methodologyDirection: input.methodology_direction ?? "",
        implementationGoal: input.implementation_goal ?? "",
        targetOutcome: input.target_outcome ?? "",
        deadline: input.deadline ?? undefined,

        primaryTopics: encodeStringArray(input.primary_topics ?? []),
        preferredMethods: encodeStringArray(input.preferred_methods ?? []),
        preferredDatasets: encodeStringArray(input.preferred_datasets ?? []),
        preferredMetrics: encodeStringArray(input.preferred_metrics ?? []),
        notesSummary: input.notes_summary ?? "",

        accent: input.accent ?? "indigo",
      })
      .returning();

    return toRecord(row);
  },

  async countActive() {
    const [r] = await db
      .select({ c: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.status, "active"));
    return Number(r?.c ?? 0);
  },

  async list(query?: { q?: string }) {
    const q = query?.q?.trim();
    const where = q ? like(projects.title, `%${q}%`) : undefined;
    const rows = await db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.updatedAt));
    return rows.map(toRecord);
  },

  async get(id: string) {
    const row = await db.query.projects.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return row ? toRecord(row) : null;
  },

  async getBySlug(slug: string) {
    const row = await db.query.projects.findFirst({
      where: (t, { eq }) => eq(t.slug, slug),
    });
    return row ? toRecord(row) : null;
  },

  async update(id: string, patch: Partial<CreateProjectInput>) {
    const [row] = await db
      .update(projects)
      .set({
        updatedAt: new Date(),
        title: patch.title ?? undefined,
        slug: patch.slug ?? undefined,
        description: patch.description ?? undefined,
        projectType: patch.project_type ?? undefined,
        status: patch.status ?? undefined,
        objective: patch.objective ?? undefined,
        thesisDirection: patch.thesis_direction ?? undefined,
        researchProblem: patch.research_problem ?? undefined,
        researchQuestions: patch.research_questions ? encodeStringArray(patch.research_questions) : undefined,
        hypothesis: patch.hypothesis ?? undefined,
        methodologyDirection: patch.methodology_direction ?? undefined,
        implementationGoal: patch.implementation_goal ?? undefined,
        targetOutcome: patch.target_outcome ?? undefined,
        deadline: patch.deadline ?? undefined,
        primaryTopics: patch.primary_topics ? encodeStringArray(patch.primary_topics) : undefined,
        preferredMethods: patch.preferred_methods ? encodeStringArray(patch.preferred_methods) : undefined,
        preferredDatasets: patch.preferred_datasets ? encodeStringArray(patch.preferred_datasets) : undefined,
        preferredMetrics: patch.preferred_metrics ? encodeStringArray(patch.preferred_metrics) : undefined,
        notesSummary: patch.notes_summary ?? undefined,
        accent: patch.accent ?? undefined,
      })
      .where(eq(projects.id, id))
      .returning();

    return row ? toRecord(row) : null;
  },
};

