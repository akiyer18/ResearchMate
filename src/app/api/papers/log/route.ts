import { NextResponse } from "next/server";
import { z } from "zod";

import { paperRepo } from "@/services/repositories/paper-repo";
import {
  defaultResearchFacets,
  defaultStructuredNotes,
  parseResearchFacets,
} from "@/types/research-facets";

const BodySchema = z.object({
  paper_title: z.string().min(1),
  authors: z.string().optional().default(""),
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().url().optional().nullable(),
  project_id: z.string().optional().nullable(),
  reading_intent: z.string().optional().default(""),
  output_depth: z.string().optional().default("standard"),
  project_relevance_score: z.number().int().min(0).max(100).optional().nullable(),
  project_fit_area: z.string().optional().default(""),
  thesis_section_fit: z.string().optional().default(""),
  paper_role: z.string().optional().default("exploratory"),
  implementation_relevance: z.string().optional().default(""),
  literature_review_relevance: z.string().optional().default(""),
  action_recommendation: z.string().optional().default(""),
  extracted_text_excerpt: z.string().optional().nullable(),

  executive_summary: z.string().optional().default(""),
  methodology_summary: z.string().optional().default(""),
  results_summary: z.string().optional().default(""),
  discussion_summary: z.string().optional().default(""),
  future_work_summary: z.string().optional().default(""),

  key_takeaways: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  important_concepts: z.array(z.string()).optional().default([]),

  user_notes: z.string().optional().default(""),
  reason_for_reading: z.string().optional().default(""),
  user_topic_tag: z.string().optional().default(""),

  processing_model: z.string().optional().default(""),
  processing_status: z.string().optional().default("completed"),
  scan_confidence: z.enum(["very_low", "low", "medium", "high"]).optional().default("medium"),

  content_type: z.enum(["research_paper", "article", "unknown"]).optional().default("research_paper"),
  scan_meta: z.record(z.string(), z.unknown()).optional().default({}),
  research_facets: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const summary = await paperRepo.createSummary({
    project_id: body.data.project_id ?? null,
    reading_intent: body.data.reading_intent ?? "",
    output_depth: body.data.output_depth ?? "standard",
    project_relevance_score: body.data.project_relevance_score ?? null,
    project_fit_area: body.data.project_fit_area ?? "",
    thesis_section_fit: body.data.thesis_section_fit ?? "",
    paper_role: body.data.paper_role ?? "exploratory",
    implementation_relevance: body.data.implementation_relevance ?? "",
    literature_review_relevance: body.data.literature_review_relevance ?? "",
    action_recommendation: body.data.action_recommendation ?? "",

    paper_title: body.data.paper_title,
    authors: body.data.authors,
    source_type: body.data.source_type,
    source_url: body.data.source_url ?? null,
    extracted_text_excerpt: body.data.extracted_text_excerpt ?? null,

    executive_summary: body.data.executive_summary,
    methodology_summary: body.data.methodology_summary,
    results_summary: body.data.results_summary,
    discussion_summary: body.data.discussion_summary,
    future_work_summary: body.data.future_work_summary,

    key_takeaways: body.data.key_takeaways,
    keywords: body.data.keywords,
    important_concepts: body.data.important_concepts,

    user_notes: body.data.user_notes,
    reason_for_reading: body.data.reason_for_reading,
    user_topic_tag: body.data.user_topic_tag,

    processing_model: body.data.processing_model,
    processing_status: body.data.processing_status,
    scan_confidence: body.data.scan_confidence,

    content_type: body.data.content_type,
    scan_meta: body.data.scan_meta ?? {},
    research_facets: body.data.research_facets
      ? parseResearchFacets(JSON.stringify(body.data.research_facets))
      : defaultResearchFacets(),
    structured_notes: defaultStructuredNotes(),
  });

  const today = new Date();
  const yyyyMmDd = today.toISOString().slice(0, 10);

  const log = await paperRepo.createLog({
    paper_summary_id: summary.id,
    project_id: summary.project_id,
    paper_title: summary.paper_title,
    date_reviewed: yyyyMmDd,
    source_type: summary.source_type,
    primary_topic: summary.user_topic_tag ?? "",
    keyword_snapshot: summary.keywords ?? [],
    user_note_preview: (summary.user_notes ?? "").slice(0, 220),
  });

  return NextResponse.json({ paper_summary: summary, paper_log: log });
}

