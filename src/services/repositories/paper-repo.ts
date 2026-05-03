import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import { paperLog, paperSummaries } from "@/db/schema";
import type {
  PaperLogRecord,
  PaperSummaryRecord,
  PaperSourceType,
  PaperScanMeta,
  ScanContentType,
} from "@/types/papers";
import {
  parseResearchFacets,
  parseStructuredNotes,
  type ResearchFacets,
  type StructuredPaperNotes,
} from "@/types/research-facets";
import { decodeStringArray, encodeStringArray } from "@/services/storage/json-arrays";

function decodeScanMeta(raw: string | null | undefined): PaperScanMeta {
  if (!raw?.trim()) return {};
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as PaperScanMeta) : {};
  } catch {
    return {};
  }
}

function toSummaryRecord(row: typeof paperSummaries.$inferSelect): PaperSummaryRecord {
  return {
    id: row.id,
    created_at: row.createdAt,
    user_id: row.userId,

    project_id: row.projectId ?? null,
    reading_intent: row.readingIntent ?? "",
    output_depth: row.outputDepth ?? "standard",
    project_relevance_score: row.projectRelevanceScore ?? null,
    project_fit_area: row.projectFitArea ?? "",
    thesis_section_fit: row.thesisSectionFit ?? "",
    paper_role: row.paperRole ?? "exploratory",
    implementation_relevance: row.implementationRelevance ?? "",
    literature_review_relevance: row.literatureReviewRelevance ?? "",
    action_recommendation: row.actionRecommendation ?? "",

    paper_title: row.paperTitle,
    authors: row.authors,
    source_type: row.sourceType as PaperSourceType,
    source_url: row.sourceUrl ?? null,

    extracted_text_excerpt: row.extractedTextExcerpt ?? null,

    executive_summary: row.executiveSummary,
    methodology_summary: row.methodologySummary,
    results_summary: row.resultsSummary,
    discussion_summary: row.discussionSummary,
    future_work_summary: row.futureWorkSummary,

    key_takeaways: decodeStringArray(row.keyTakeaways),
    keywords: decodeStringArray(row.keywords),
    important_concepts: decodeStringArray(row.importantConcepts),

    user_notes: row.userNotes,
    reason_for_reading: row.reasonForReading,
    user_topic_tag: row.userTopicTag,

    processing_model: row.processingModel,
    processing_status: row.processingStatus,
    scan_confidence: row.scanConfidence as PaperSummaryRecord["scan_confidence"],

    content_type: (row.contentType ?? "research_paper") as ScanContentType,
    scan_meta: decodeScanMeta(row.scanMeta),

    research_facets: parseResearchFacets(row.researchFacets),
    structured_notes: parseStructuredNotes(row.structuredNotes),
    last_opened_at: row.lastOpenedAt ?? null,
  };
}

function toLogRecord(row: typeof paperLog.$inferSelect): PaperLogRecord {
  return {
    id: row.id,
    created_at: row.createdAt,
    user_id: row.userId,

    project_id: row.projectId ?? null,
    paper_summary_id: row.paperSummaryId,
    paper_title: row.paperTitle,
    date_reviewed: row.dateReviewed,
    source_type: row.sourceType as PaperSourceType,
    primary_topic: row.primaryTopic,
    keyword_snapshot: decodeStringArray(row.keywordSnapshot),
    user_note_preview: row.userNotePreview,
  };
}

export type CreatePaperSummaryInput = Omit<
  PaperSummaryRecord,
  "id" | "created_at" | "user_id" | "last_opened_at"
> & { user_id?: string; last_opened_at?: Date | null };

export type CreatePaperLogInput = Omit<PaperLogRecord, "id" | "created_at" | "user_id"> & {
  user_id?: string;
};

export type ArchiveQuery = {
  q?: string;
  sourceType?: PaperSourceType | "all";
  topic?: string;
  keyword?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  /** Match if facets.methods contains each tag (case-insensitive substring on JSON value) */
  methods?: string[];
  datasets?: string[];
  performanceLevels?: string[];
  confidenceLevels?: PaperSummaryRecord["scan_confidence"][];
  projectId?: string;
  limit?: number;
  offset?: number;
  /** createdAt | lastOpenedAt | title */
  sort?: "created_desc" | "opened_desc" | "title_asc";
};

export const paperRepo = {
  async createSummary(input: CreatePaperSummaryInput) {
    const userId = input.user_id ?? "local";
    const [row] = await db
      .insert(paperSummaries)
      .values({
        userId,
        paperTitle: input.paper_title,
        authors: input.authors ?? "",
        sourceType: input.source_type,
        sourceUrl: input.source_url ?? undefined,
        projectId: input.project_id ?? undefined,
        readingIntent: input.reading_intent ?? "",
        outputDepth: input.output_depth ?? "standard",
        projectRelevanceScore: input.project_relevance_score ?? undefined,
        projectFitArea: input.project_fit_area ?? "",
        thesisSectionFit: input.thesis_section_fit ?? "",
        paperRole: input.paper_role ?? "exploratory",
        implementationRelevance: input.implementation_relevance ?? "",
        literatureReviewRelevance: input.literature_review_relevance ?? "",
        actionRecommendation: input.action_recommendation ?? "",
        extractedTextExcerpt: input.extracted_text_excerpt ?? undefined,

        executiveSummary: input.executive_summary ?? "",
        methodologySummary: input.methodology_summary ?? "",
        resultsSummary: input.results_summary ?? "",
        discussionSummary: input.discussion_summary ?? "",
        futureWorkSummary: input.future_work_summary ?? "",

        keyTakeaways: encodeStringArray(input.key_takeaways ?? []),
        keywords: encodeStringArray(input.keywords ?? []),
        importantConcepts: encodeStringArray(input.important_concepts ?? []),

        userNotes: input.user_notes ?? "",
        reasonForReading: input.reason_for_reading ?? "",
        userTopicTag: input.user_topic_tag ?? "",

        processingModel: input.processing_model ?? "",
        processingStatus: input.processing_status ?? "completed",
        scanConfidence: input.scan_confidence ?? "medium",

        contentType: input.content_type ?? "research_paper",
        scanMeta:
          typeof input.scan_meta === "string"
            ? input.scan_meta
            : JSON.stringify(input.scan_meta ?? {}),

        researchFacets: JSON.stringify(input.research_facets ?? {}),
        structuredNotes: JSON.stringify(input.structured_notes ?? {}),
      })
      .returning();

    return toSummaryRecord(row);
  },

  async getLogByPaperSummaryId(paper_summary_id: string) {
    const row = await db.query.paperLog.findFirst({
      where: (t, { eq }) => eq(t.paperSummaryId, paper_summary_id),
    });
    return row ? toLogRecord(row) : null;
  },

  async logExistingSummary(input: { project_id: string; paper_summary_id: string }) {
    const existing = await this.getLogByPaperSummaryId(input.paper_summary_id);
    if (existing) {
      return { paper_log: existing, already_logged: true };
    }

    const summary = await this.getSummary(input.paper_summary_id);
    if (!summary) {
      return { paper_log: null, already_logged: false, reason: "Summary not found" };
    }

    const today = new Date().toISOString().slice(0, 10);
    const log = await this.createLog({
      paper_summary_id: summary.id,
      project_id: input.project_id,
      paper_title: summary.paper_title,
      date_reviewed: today,
      source_type: summary.source_type,
      primary_topic: summary.user_topic_tag ?? "",
      keyword_snapshot: summary.keywords ?? [],
      user_note_preview: (summary.user_notes ?? "").slice(0, 220),
    });

    return { paper_log: log, already_logged: false };
  },

  async createLog(input: CreatePaperLogInput) {
    const userId = input.user_id ?? "local";
    const [row] = await db
      .insert(paperLog)
      .values({
        userId,
        paperSummaryId: input.paper_summary_id,
        projectId: input.project_id ?? undefined,
        paperTitle: input.paper_title,
        dateReviewed: input.date_reviewed,
        sourceType: input.source_type,
        primaryTopic: input.primary_topic ?? "",
        keywordSnapshot: encodeStringArray(input.keyword_snapshot ?? []),
        userNotePreview: input.user_note_preview ?? "",
      })
      .returning();

    return toLogRecord(row);
  },

  async getSummary(id: string) {
    const row = await db.query.paperSummaries.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });
    return row ? toSummaryRecord(row) : null;
  },

  async deleteSummary(id: string) {
    const [row] = await db
      .delete(paperSummaries)
      .where(eq(paperSummaries.id, id))
      .returning();
    return row ? toSummaryRecord(row) : null;
  },

  async updateSummaryNotes(
    id: string,
    input: {
      user_notes?: string;
      user_topic_tag?: string;
      reason_for_reading?: string;
      structured_notes?: Partial<StructuredPaperNotes>;
    }
  ) {
    const existing = await this.getSummary(id);
    if (!existing) return null;

    const mergedStructured =
      input.structured_notes !== undefined
        ? { ...existing.structured_notes, ...input.structured_notes }
        : existing.structured_notes;

    const [row] = await db
      .update(paperSummaries)
      .set({
        userNotes: input.user_notes ?? existing.user_notes,
        userTopicTag: input.user_topic_tag ?? existing.user_topic_tag,
        reasonForReading: input.reason_for_reading ?? existing.reason_for_reading,
        structuredNotes: JSON.stringify(mergedStructured),
      })
      .where(eq(paperSummaries.id, id))
      .returning();

    return row ? toSummaryRecord(row) : null;
  },

  async touchLastOpened(id: string) {
    const [row] = await db
      .update(paperSummaries)
      .set({ lastOpenedAt: new Date() })
      .where(eq(paperSummaries.id, id))
      .returning();
    return row ? toSummaryRecord(row) : null;
  },

  async mergeResearchFacets(id: string, facets: Partial<ResearchFacets>) {
    const cur = await this.getSummary(id);
    if (!cur) return null;
    const next: ResearchFacets = {
      ...cur.research_facets,
      ...facets,
      methods: facets.methods ?? cur.research_facets.methods,
      datasets: facets.datasets ?? cur.research_facets.datasets,
    };
    const [row] = await db
      .update(paperSummaries)
      .set({ researchFacets: JSON.stringify(next) })
      .where(eq(paperSummaries.id, id))
      .returning();
    return row ? toSummaryRecord(row) : null;
  },

  buildArchiveWhere(query: ArchiveQuery) {
    const filters = [];

    if (query.projectId) {
      filters.push(eq(paperSummaries.projectId, query.projectId));
    }

    if (query.sourceType && query.sourceType !== "all") {
      filters.push(eq(paperSummaries.sourceType, query.sourceType));
    }
    if (query.topic && query.topic.trim()) {
      filters.push(like(paperSummaries.userTopicTag, `%${query.topic.trim()}%`));
    }
    if (query.fromDate) {
      // created_at is stored as unixepoch timestamp; compare via date() on unixepoch
      filters.push(
        sql`date(${paperSummaries.createdAt}, 'unixepoch') >= date(${query.fromDate})`
      );
    }
    if (query.toDate) {
      filters.push(
        sql`date(${paperSummaries.createdAt}, 'unixepoch') <= date(${query.toDate})`
      );
    }

    if (query.q && query.q.trim()) {
      const q = `%${query.q.trim()}%`;
      filters.push(
        or(
          like(paperSummaries.paperTitle, q),
          like(paperSummaries.authors, q),
          like(paperSummaries.userNotes, q),
          like(paperSummaries.userTopicTag, q)
        )!
      );
    }

    if (query.keyword && query.keyword.trim()) {
      filters.push(like(paperSummaries.keywords, `%${query.keyword.trim()}%`));
    }

    for (const m of query.methods ?? []) {
      const tag = m.trim().toLowerCase();
      if (!tag) continue;
      filters.push(
        sql`exists (select 1 from json_each(${paperSummaries.researchFacets}, '$.methods') j where lower(j.value) like ${"%" + tag + "%"})`
      );
    }

    for (const d of query.datasets ?? []) {
      const tag = d.trim().toLowerCase();
      if (!tag) continue;
      filters.push(
        sql`exists (select 1 from json_each(${paperSummaries.researchFacets}, '$.datasets') j where lower(j.value) like ${"%" + tag + "%"})`
      );
    }

    if (query.performanceLevels?.length) {
      filters.push(
        sql`json_extract(${paperSummaries.researchFacets}, '$.performance_level') in (${sql.join(
          query.performanceLevels.map((p) => sql`${p}`),
          sql`, `
        )})`
      );
    }

    if (query.confidenceLevels?.length) {
      filters.push(inArray(paperSummaries.scanConfidence, query.confidenceLevels));
    }

    return filters.length ? and(...filters) : undefined;
  },

  async listArchive(query: ArchiveQuery) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const where = this.buildArchiveWhere(query);
    const sort = query.sort ?? "created_desc";
    const orderBy =
      sort === "title_asc"
        ? paperSummaries.paperTitle
        : sort === "opened_desc"
          ? desc(
              sql`coalesce(${paperSummaries.lastOpenedAt}, ${paperSummaries.createdAt})`
            )
          : desc(paperSummaries.createdAt);

    const rows = await db
      .select()
      .from(paperSummaries)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return rows.map(toSummaryRecord);
  },

  async listByProject(project_id: string, limit = 200, query?: Omit<ArchiveQuery, "projectId">) {
    return this.listArchive({
      ...query,
      projectId: project_id,
      limit: query?.limit ?? limit,
    });
  },

  async countSince(createdAfter: Date) {
    const [r] = await db
      .select({ c: sql<number>`count(*)` })
      .from(paperSummaries)
      .where(gte(paperSummaries.createdAt, createdAfter));
    return Number(r?.c ?? 0);
  },

  /** Saved 14+ days ago, not opened in 21+ days (or never), with some content. */
  async listDecayCandidates(limit = 8) {
    const cutoffCreated = new Date();
    cutoffCreated.setDate(cutoffCreated.getDate() - 14);
    const cutoffOpen = new Date();
    cutoffOpen.setDate(cutoffOpen.getDate() - 21);
    const rows = await db
      .select()
      .from(paperSummaries)
      .where(
        and(
          lte(paperSummaries.createdAt, cutoffCreated),
          or(
            isNull(paperSummaries.lastOpenedAt),
            lte(paperSummaries.lastOpenedAt, cutoffOpen)
          )!,
          sql`length(${paperSummaries.executiveSummary}) > 80`
        )
      )
      .orderBy(desc(paperSummaries.createdAt))
      .limit(Math.min(Math.max(limit, 1), 20));
    return rows.map(toSummaryRecord);
  },
};

