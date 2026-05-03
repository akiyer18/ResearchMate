import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Notes:
// - SQLite doesn't have a native UUID type; we store UUID strings.
// - Arrays are stored as JSON strings (compat with Supabase jsonb fields).

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),

  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  projectType: text("project_type").notNull().default("thesis"),
  status: text("status").notNull().default("active"),

  objective: text("objective").notNull().default(""),
  thesisDirection: text("thesis_direction").notNull().default(""),
  researchProblem: text("research_problem").notNull().default(""),
  researchQuestions: text("research_questions").notNull().default("[]"), // JSON array string
  hypothesis: text("hypothesis"),
  methodologyDirection: text("methodology_direction").notNull().default(""),
  implementationGoal: text("implementation_goal").notNull().default(""),
  targetOutcome: text("target_outcome").notNull().default(""),
  deadline: text("deadline"), // YYYY-MM-DD

  primaryTopics: text("primary_topics").notNull().default("[]"),
  preferredMethods: text("preferred_methods").notNull().default("[]"),
  preferredDatasets: text("preferred_datasets").notNull().default("[]"),
  preferredMetrics: text("preferred_metrics").notNull().default("[]"),
  notesSummary: text("notes_summary").notNull().default(""),

  accent: text("accent").notNull().default("indigo"),
});

export const paperSummaries = sqliteTable("paper_summaries", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),

  paperTitle: text("paper_title").notNull(),
  authors: text("authors").notNull().default(""),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),

  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  readingIntent: text("reading_intent").notNull().default(""),
  outputDepth: text("output_depth").notNull().default("standard"),
  projectRelevanceScore: integer("project_relevance_score"),
  projectFitArea: text("project_fit_area").notNull().default(""),
  thesisSectionFit: text("thesis_section_fit").notNull().default(""),
  paperRole: text("paper_role").notNull().default("exploratory"),
  implementationRelevance: text("implementation_relevance").notNull().default(""),
  literatureReviewRelevance: text("literature_review_relevance").notNull().default(""),
  actionRecommendation: text("action_recommendation").notNull().default(""),

  extractedTextExcerpt: text("extracted_text_excerpt"),

  executiveSummary: text("executive_summary").notNull().default(""),
  methodologySummary: text("methodology_summary").notNull().default(""),
  resultsSummary: text("results_summary").notNull().default(""),
  discussionSummary: text("discussion_summary").notNull().default(""),
  futureWorkSummary: text("future_work_summary").notNull().default(""),

  keyTakeaways: text("key_takeaways").notNull().default("[]"), // JSON array string
  keywords: text("keywords").notNull().default("[]"), // JSON array string
  importantConcepts: text("important_concepts").notNull().default("[]"), // JSON array string

  userNotes: text("user_notes").notNull().default(""),
  reasonForReading: text("reason_for_reading").notNull().default(""),
  userTopicTag: text("user_topic_tag").notNull().default(""),

  processingModel: text("processing_model").notNull().default(""),
  processingStatus: text("processing_status").notNull().default("completed"),
  scanConfidence: text("scan_confidence").notNull().default("medium"),

  /** research_paper | article | unknown */
  contentType: text("content_type").notNull().default("research_paper"),
  /** JSON blob: classification, section_detection, article/research extras */
  scanMeta: text("scan_meta").notNull().default("{}"),

  /** Filterable research metadata (methods, datasets, performance, contribution) */
  researchFacets: text("research_facets").notNull().default("{}"),
  /** Structured research thinking fields (idea, critique, tasks, …) */
  structuredNotes: text("structured_notes").notNull().default("{}"),
  /** Last time user opened this paper in the archive/results UI */
  lastOpenedAt: integer("last_opened_at", { mode: "timestamp" }),
});

export const paperLog = sqliteTable("paper_log", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),

  paperSummaryId: text("paper_summary_id")
    .notNull()
    .references(() => paperSummaries.id, { onDelete: "cascade" }),

  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),

  paperTitle: text("paper_title").notNull(),
  dateReviewed: text("date_reviewed").notNull(), // YYYY-MM-DD
  sourceType: text("source_type").notNull(),
  primaryTopic: text("primary_topic").notNull().default(""),
  keywordSnapshot: text("keyword_snapshot").notNull().default("[]"),
  userNotePreview: text("user_note_preview").notNull().default(""),
});

export const projectNotes = sqliteTable("project_notes", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  noteType: text("note_type").notNull().default("note"),
  tags: text("tags").notNull().default("[]"),
  /** Optional link to a paper summary for cross-navigation & search */
  paperSummaryId: text("paper_summary_id").references(() => paperSummaries.id, {
    onDelete: "set null",
  }),
});

export const projectInsights = sqliteTable("project_insights", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  paperSummaryId: text("paper_summary_id")
    .notNull()
    .references(() => paperSummaries.id, { onDelete: "cascade" }),

  relevanceExplanation: text("relevance_explanation").notNull().default(""),
  projectFitSummary: text("project_fit_summary").notNull().default(""),
  fitArea: text("fit_area").notNull().default(""),

  thesisUsefulness: text("thesis_usefulness").notNull().default(""),
  methodologyUsefulness: text("methodology_usefulness").notNull().default(""),
  implementationUsefulness: text("implementation_usefulness").notNull().default(""),
  literatureReviewUsefulness: text("literature_review_usefulness").notNull().default(""),
  discussionUsefulness: text("discussion_usefulness").notNull().default(""),
  futureWorkUsefulness: text("future_work_usefulness").notNull().default(""),

  relatedProjectPapers: text("related_project_papers").notNull().default("[]"),
  improvementSuggestions: text("improvement_suggestions").notNull().default("[]"),
  gapsIdentified: text("gaps_identified").notNull().default("[]"),
  contradictionsOrRisks: text("contradictions_or_risks").notNull().default("[]"),
  recommendedActions: text("recommended_actions").notNull().default("[]"),
  recommendedThesisSections: text("recommended_thesis_sections").notNull().default("[]"),

  priorityLevel: text("priority_level").notNull().default("optional"),
  confidenceNotes: text("confidence_notes").notNull().default(""),
});

export const projectActivity = sqliteTable("project_activity", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  userId: text("user_id").notNull().default("local"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  activityType: text("activity_type").notNull(),
  entityId: text("entity_id"),
  title: text("title").notNull().default(""),
  summary: text("summary").notNull().default(""),
});

/** Cross-app “continue where you left off” (papers, projects, scanner). */
export const recentActivity = sqliteTable(
  "recent_activity",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull().default("local"),
    kind: text("kind").notNull(),
    entityId: text("entity_id").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    meta: text("meta").notNull().default("{}"),
    lastActiveAt: integer("last_active_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    recentActivityUserKindEntity: uniqueIndex("recent_activity_user_kind_entity").on(
      t.userId,
      t.kind,
      t.entityId
    ),
  })
);

/** Per-project writing surface + generated literature review drafts. */
export const projectWriting = sqliteTable("project_writing", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().default("local"),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  body: text("body").notNull().default(""),
  litReviewDraft: text("lit_review_draft").notNull().default(""),
  litReviewGeneratedAt: integer("lit_review_generated_at", { mode: "timestamp" }),
  litReviewSourceHash: text("lit_review_source_hash").notNull().default(""),
  citationStyle: text("citation_style").notNull().default("apa-lite"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Optional sub-groups inside a project for clustering papers. */
export const collections = sqliteTable("collections", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().default("local"),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** Optional color token, e.g. indigo|emerald|fuchsia|amber|cyan|none */
  color: text("color").notNull().default("none"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Many-to-many mapping between papers and collections. */
export const paperCollections = sqliteTable(
  "paper_collections",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull().default("local"),
    paperId: text("paper_id")
      .notNull()
      .references(() => paperSummaries.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    paperCollectionUnique: uniqueIndex("paper_collections_paper_collection").on(
      t.userId,
      t.paperId,
      t.collectionId
    ),
  })
);

export const providerUsageDaily = sqliteTable("provider_usage_daily", {
  id: text("id")
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`),
  providerName: text("provider_name").notNull(),
  usageDate: text("usage_date").notNull(), // YYYY-MM-DD

  requestsCount: integer("requests_count").notNull().default(0),
  estimatedTokens: integer("estimated_tokens").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
});

