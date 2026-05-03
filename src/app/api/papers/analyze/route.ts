import { NextResponse } from "next/server";
import { z } from "zod";

import { ingestUrl } from "@/services/ingest/url";
import { runDocumentScan } from "@/services/analysis/document-scan";

const BodySchema = z.object({
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().url().optional().nullable(),
  paper_text: z.string().optional().default(""),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: body.error.flatten() },
      { status: 400 }
    );
  }

  let text = body.data.paper_text ?? "";
  let inferredTitle: string | undefined;
  let urlIsPdf = false;

  if (body.data.source_type === "url" && body.data.source_url) {
    const ingested = await ingestUrl(body.data.source_url);

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
    // If user pasted excerpt, append it; otherwise use ingested text.
    const excerpt = (body.data.paper_text ?? "").trim();
    text = ingested.text + (excerpt ? `\n\nUSER EXCERPT:\n${excerpt}` : "");
  }

  if (!text.trim()) {
    return NextResponse.json(
      {
        error: "no_text_to_analyze",
        userMessage:
          "No text is available to analyze. Paste content directly, or provide a URL/PDF that can be fetched.",
      },
      { status: 400 }
    );
  }

  const isPdfSource = body.data.source_type === "pdf" || urlIsPdf;

  const { analysis, scanMeta, researchFacets } = await runDocumentScan({
    paperText: text,
    sourceUrl: body.data.source_url,
    isPdf: isPdfSource,
  });

  const scanMetaOut = {
    ...scanMeta,
    ...(body.data.source_type === "url" && body.data.source_url
      ? {
          ingestion: {
            status: "ok",
            url: body.data.source_url,
            is_pdf: urlIsPdf,
          },
        }
      : {}),
  };

  // If URL ingestion produced a title but model didn't, prefer inferred.
  const patched = inferredTitle && !analysis.title ? { ...analysis, title: inferredTitle } : analysis;

  return NextResponse.json({
    source_type: body.data.source_type,
    source_url: body.data.source_url ?? null,
    generated_at: new Date().toISOString(),
    analysis: patched,
    scan_meta: scanMetaOut,
    content_type: scanMetaOut.content_type,
    research_facets: researchFacets,
  });
}

