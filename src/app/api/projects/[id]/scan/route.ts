import { NextResponse } from "next/server";
import { z } from "zod";

import { ingestUrl } from "@/services/ingest/url";
import { projectRepo } from "@/services/repositories/project-repo";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectInsightsRepo } from "@/services/repositories/project-insights-repo";
import { collectionsRepo } from "@/services/repositories/collections-repo";
import { runDocumentScan } from "@/services/analysis/document-scan";
import { defaultStructuredNotes } from "@/types/research-facets";
import { ProjectInsightsService } from "@/services/project/project-insights-service";

const BodySchema = z.object({
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().url().nullable().optional(),
  paper_text: z.string().optional().default(""),

  reading_intent: z.string().min(1),
  output_depth: z.enum(["quick", "standard", "deep"]).default("standard"),
  /** Optional: assign scanned paper to a collection immediately. */
  collection_id: z.string().nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  let text = body.data.paper_text ?? "";
  let inferredTitle: string | undefined;
  let urlIsPdf = false;

  if (body.data.source_type === "url") {
    const url = body.data.source_url?.trim();
    if (!url) {
      return NextResponse.json(
        {
          error: "missing_url",
          userMessage: "Add a paper URL to scan from the web.",
        },
        { status: 400 }
      );
    }

    const ingested = await ingestUrl(url);
    if (!ingested.success) {
      const message =
        ingested.status === "blocked"
          ? ingested.userMessage ??
            "This site could not be scraped due to access or security restrictions. Please paste the content manually."
          : ingested.userMessage ??
            "We could not fetch or extract content from this URL. Please paste the text manually.";

      return NextResponse.json(
        {
          error: "url_ingestion_failed",
          status: ingested.status,
          reason: ingested.reason,
          userMessage: message,
        },
        { status: 400 }
      );
    }

    urlIsPdf = ingested.isPdf;
    inferredTitle = ingested.title;
    const excerpt = text.trim();
    text = ingested.text + (excerpt ? `\n\nUSER EXCERPT:\n${excerpt}` : "");
  }

  if (!text.trim()) {
    return NextResponse.json(
      {
        error: "no_text_to_analyze",
        userMessage:
          "No text is available to analyze. Paste content directly, upload a PDF, or provide a URL that can be fetched.",
      },
      { status: 400 }
    );
  }

  const isPdfSource = body.data.source_type === "pdf" || urlIsPdf;

  const { analysis, scanMeta, researchFacets } = await runDocumentScan({
    paperText: text,
    sourceUrl: body.data.source_url ?? null,
    isPdf: isPdfSource,
  });

  const analysisPatched =
    inferredTitle && !analysis.title ? { ...analysis, title: inferredTitle } : analysis;

  const scanMetaOut = {
    ...scanMeta,
    ...(body.data.source_type === "url" && body.data.source_url
      ? {
          ingestion: {
            status: "ok" as const,
            url: body.data.source_url,
            is_pdf: urlIsPdf,
          },
        }
      : {}),
  };

  // Persist summary first (project-aware fields included)
  const summary = await paperRepo.createSummary({
    project_id: projectId,
    reading_intent: body.data.reading_intent,
    output_depth: body.data.output_depth,

    // Enriched-by-insights fields will be updated later (LLM-enabled step)
    project_relevance_score: null,
    project_fit_area: "",
    thesis_section_fit: "",
    paper_role: "exploratory",
    implementation_relevance: "",
    literature_review_relevance: "",
    action_recommendation: "",

    paper_title: analysisPatched.title || "Untitled paper",
    authors: analysisPatched.authors || "",
    source_type: body.data.source_type,
    source_url: body.data.source_url ?? null,
    extracted_text_excerpt: text.slice(0, 1200),

    executive_summary: analysisPatched.abstract_or_overview ?? "",
    methodology_summary: analysisPatched.methodology ?? "",
    results_summary: analysisPatched.results ?? "",
    discussion_summary: analysisPatched.discussion ?? "",
    future_work_summary: analysisPatched.future_work ?? "",
    key_takeaways: analysisPatched.key_takeaways ?? [],
    keywords: analysisPatched.keywords ?? [],
    important_concepts: analysisPatched.important_concepts ?? [],

    user_notes: "",
    reason_for_reading: "",
    user_topic_tag: project.primary_topics?.[0] ?? "",

    processing_model: analysisPatched.processing_model ?? "local-placeholder",
    processing_status: "completed",
    scan_confidence:
      analysisPatched.confidence === "high"
        ? "high"
        : analysisPatched.confidence === "medium"
          ? "medium"
          : analysisPatched.confidence === "low"
            ? "low"
            : "very_low",

    content_type: scanMetaOut.content_type,
    scan_meta: scanMetaOut as unknown as Record<string, unknown>,
    research_facets: researchFacets,
    structured_notes: defaultStructuredNotes(),
  });

  if (body.data.collection_id) {
    await collectionsRepo.setPaperCollections({
      paper_id: summary.id,
      project_id: projectId,
      collection_ids: [body.data.collection_id],
      multi_assign: false,
    });
  }

  const existing = await paperRepo.listByProject(projectId, 200);
  const insightsService = new ProjectInsightsService();
  const { insights } = await insightsService.generate({
    project,
    reading_intent: body.data.reading_intent,
    output_depth: body.data.output_depth,
    newPaper: {
      title: analysisPatched.title,
      authors: analysisPatched.authors,
      abstract_or_overview: analysisPatched.abstract_or_overview,
      methodology: analysisPatched.methodology,
      results: analysisPatched.results,
      discussion: analysisPatched.discussion,
      future_work: analysisPatched.future_work,
      key_takeaways: analysisPatched.key_takeaways ?? [],
      keywords: analysisPatched.keywords ?? [],
      important_concepts: analysisPatched.important_concepts ?? [],
      confidence_notes: analysisPatched.confidence_notes ?? "",
    },
    existingProjectPapers: existing.filter((p) => p.id !== summary.id),
  });

  const persisted = await projectInsightsRepo.upsertForPaper({
    project_id: projectId,
    paper_summary_id: summary.id,
    relevance_explanation: insights.relevance_explanation,
    project_fit_summary: insights.project_fit_summary,
    fit_area: insights.fit_area,
    thesis_usefulness: insights.thesis_usefulness,
    methodology_usefulness: insights.methodology_usefulness,
    implementation_usefulness: insights.implementation_usefulness,
    literature_review_usefulness: insights.literature_review_usefulness,
    discussion_usefulness: insights.discussion_usefulness,
    future_work_usefulness: insights.future_work_usefulness,
    related_project_papers: insights.related_project_papers,
    improvement_suggestions: insights.improvement_suggestions,
    gaps_identified: insights.gaps_identified,
    contradictions_or_risks: insights.contradictions_or_risks,
    recommended_actions: insights.recommended_actions,
    recommended_thesis_sections: insights.recommended_thesis_sections,
    priority_level: insights.priority_level,
    confidence_notes: insights.confidence_notes,
  });

  return NextResponse.json({
    project_id: projectId,
    paper_summary: summary,
    project_insights: persisted,
    scan_meta: scanMetaOut,
    content_type: scanMetaOut.content_type,
    generated_at: new Date().toISOString(),
  });
}

