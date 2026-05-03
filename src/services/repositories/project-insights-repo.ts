import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { projectInsights } from "@/db/schema";
import { decodeStringArray, encodeStringArray } from "@/services/storage/json-arrays";

export type ProjectInsightRecord = {
  id: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  project_id: string;
  paper_summary_id: string;

  relevance_explanation: string;
  project_fit_summary: string;
  fit_area: string;

  thesis_usefulness: string;
  methodology_usefulness: string;
  implementation_usefulness: string;
  literature_review_usefulness: string;
  discussion_usefulness: string;
  future_work_usefulness: string;

  related_project_papers: unknown[];
  improvement_suggestions: string[];
  gaps_identified: string[];
  contradictions_or_risks: string[];
  recommended_actions: string[];
  recommended_thesis_sections: string[];

  priority_level: string;
  confidence_notes: string;
};

function decodeJsonArray(text: string) {
  try {
    const v = JSON.parse(text) as unknown;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function toRecord(row: typeof projectInsights.$inferSelect): ProjectInsightRecord {
  return {
    id: row.id,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    user_id: row.userId,
    project_id: row.projectId,
    paper_summary_id: row.paperSummaryId,

    relevance_explanation: row.relevanceExplanation,
    project_fit_summary: row.projectFitSummary,
    fit_area: row.fitArea,

    thesis_usefulness: row.thesisUsefulness,
    methodology_usefulness: row.methodologyUsefulness,
    implementation_usefulness: row.implementationUsefulness,
    literature_review_usefulness: row.literatureReviewUsefulness,
    discussion_usefulness: row.discussionUsefulness,
    future_work_usefulness: row.futureWorkUsefulness,

    related_project_papers: decodeJsonArray(row.relatedProjectPapers),
    improvement_suggestions: decodeStringArray(row.improvementSuggestions),
    gaps_identified: decodeStringArray(row.gapsIdentified),
    contradictions_or_risks: decodeStringArray(row.contradictionsOrRisks),
    recommended_actions: decodeStringArray(row.recommendedActions),
    recommended_thesis_sections: decodeStringArray(row.recommendedThesisSections),

    priority_level: row.priorityLevel,
    confidence_notes: row.confidenceNotes,
  };
}

export const projectInsightsRepo = {
  async upsertForPaper(input: Omit<ProjectInsightRecord, "id" | "created_at" | "updated_at" | "user_id"> & { user_id?: string }) {
    const userId = input.user_id ?? "local";

    const existing = await db.query.projectInsights.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.projectId, input.project_id), eq(t.paperSummaryId, input.paper_summary_id)),
    });

    if (!existing) {
      const [row] = await db
        .insert(projectInsights)
        .values({
          userId,
          projectId: input.project_id,
          paperSummaryId: input.paper_summary_id,
          relevanceExplanation: input.relevance_explanation ?? "",
          projectFitSummary: input.project_fit_summary ?? "",
          fitArea: input.fit_area ?? "",

          thesisUsefulness: input.thesis_usefulness ?? "",
          methodologyUsefulness: input.methodology_usefulness ?? "",
          implementationUsefulness: input.implementation_usefulness ?? "",
          literatureReviewUsefulness: input.literature_review_usefulness ?? "",
          discussionUsefulness: input.discussion_usefulness ?? "",
          futureWorkUsefulness: input.future_work_usefulness ?? "",

          relatedProjectPapers: JSON.stringify(input.related_project_papers ?? []),
          improvementSuggestions: encodeStringArray(input.improvement_suggestions ?? []),
          gapsIdentified: encodeStringArray(input.gaps_identified ?? []),
          contradictionsOrRisks: encodeStringArray(input.contradictions_or_risks ?? []),
          recommendedActions: encodeStringArray(input.recommended_actions ?? []),
          recommendedThesisSections: encodeStringArray(input.recommended_thesis_sections ?? []),

          priorityLevel: input.priority_level ?? "optional",
          confidenceNotes: input.confidence_notes ?? "",
        })
        .returning();
      return toRecord(row);
    }

    const [row] = await db
      .update(projectInsights)
      .set({
        updatedAt: new Date(),
        relevanceExplanation: input.relevance_explanation ?? "",
        projectFitSummary: input.project_fit_summary ?? "",
        fitArea: input.fit_area ?? "",
        thesisUsefulness: input.thesis_usefulness ?? "",
        methodologyUsefulness: input.methodology_usefulness ?? "",
        implementationUsefulness: input.implementation_usefulness ?? "",
        literatureReviewUsefulness: input.literature_review_usefulness ?? "",
        discussionUsefulness: input.discussion_usefulness ?? "",
        futureWorkUsefulness: input.future_work_usefulness ?? "",
        relatedProjectPapers: JSON.stringify(input.related_project_papers ?? []),
        improvementSuggestions: encodeStringArray(input.improvement_suggestions ?? []),
        gapsIdentified: encodeStringArray(input.gaps_identified ?? []),
        contradictionsOrRisks: encodeStringArray(input.contradictions_or_risks ?? []),
        recommendedActions: encodeStringArray(input.recommended_actions ?? []),
        recommendedThesisSections: encodeStringArray(input.recommended_thesis_sections ?? []),
        priorityLevel: input.priority_level ?? "optional",
        confidenceNotes: input.confidence_notes ?? "",
      })
      .where(eq(projectInsights.id, existing.id))
      .returning();

    return toRecord(row);
  },

  async listByProject(project_id: string, limit = 100) {
    const rows = await db
      .select()
      .from(projectInsights)
      .where(eq(projectInsights.projectId, project_id))
      .orderBy(desc(projectInsights.updatedAt))
      .limit(Math.min(Math.max(limit, 1), 200));
    return rows.map(toRecord);
  },

  async getForPaper(project_id: string, paper_summary_id: string) {
    const row = await db.query.projectInsights.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.projectId, project_id), eq(t.paperSummaryId, paper_summary_id)),
    });
    return row ? toRecord(row) : null;
  },
};

