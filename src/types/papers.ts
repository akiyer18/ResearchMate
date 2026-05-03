import type { ResearchFacets, StructuredPaperNotes } from "@/types/research-facets";

export type PaperSourceType = "pdf" | "url" | "text";

export type ScanContentType = "research_paper" | "article" | "unknown";

export type ScanConfidence = "very_low" | "low" | "medium" | "high";

/** Stored JSON from document scan pipeline (classification, sections, extras). */
export type PaperScanMeta = Record<string, unknown>;

export type PaperSummaryRecord = {
  id: string;
  created_at: Date;
  user_id: string;

  project_id: string | null;
  reading_intent: string;
  output_depth: string;
  project_relevance_score: number | null;
  project_fit_area: string;
  thesis_section_fit: string;
  paper_role: string;
  implementation_relevance: string;
  literature_review_relevance: string;
  action_recommendation: string;

  paper_title: string;
  authors: string;
  source_type: PaperSourceType;
  source_url: string | null;

  extracted_text_excerpt: string | null;

  executive_summary: string;
  methodology_summary: string;
  results_summary: string;
  discussion_summary: string;
  future_work_summary: string;

  key_takeaways: string[];
  keywords: string[];
  important_concepts: string[];

  user_notes: string;
  reason_for_reading: string;
  user_topic_tag: string;

  processing_model: string;
  processing_status: string;
  scan_confidence: ScanConfidence;

  content_type: ScanContentType;
  scan_meta: PaperScanMeta;

  research_facets: ResearchFacets;
  structured_notes: StructuredPaperNotes;
  last_opened_at: Date | null;
};

export type PaperLogRecord = {
  id: string;
  created_at: Date;
  user_id: string;

  project_id: string | null;
  paper_summary_id: string;
  paper_title: string;
  date_reviewed: string; // YYYY-MM-DD
  source_type: PaperSourceType;
  primary_topic: string;
  keyword_snapshot: string[];
  user_note_preview: string;
};

export type ProviderUsageDailyRecord = {
  id: string;
  provider_name: string;
  usage_date: string; // YYYY-MM-DD
  requests_count: number;
  estimated_tokens: number;
  success_count: number;
  failure_count: number;
};

