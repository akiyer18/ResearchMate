import type { ChatMessage } from "@/services/llm/types";
import { tryParseJson } from "@/lib/json";
import { classifyContentType } from "@/lib/content-detection";
import { detectSections, type SectionDetectionResult } from "@/lib/section-detection";
import type { PaperAnalysis } from "@/prompts/paper-analysis";
import {
  ArticleDeepSchema,
  buildArticleDeepScanPrompt,
  type ArticleDeep,
} from "@/prompts/article-deep";
import {
  ResearchPaperDeepSchema,
  buildResearchPaperDeepScanPrompt,
  type ResearchPaperDeep,
} from "@/prompts/research-paper-deep";
import { buildDefaultProviderRouter } from "@/services/llm/router-factory";
import {
  defaultResearchFacets,
  type ResearchFacets,
} from "@/types/research-facets";

export type ScanMeta = {
  content_type: "research_paper" | "article" | "unknown";
  classification: {
    primary: string;
    confidence: string;
    rationale: string;
    scores: { paper: number; article: number };
  };
  section_detection: SectionDetectionResult & {
    /** Same as section_detection.strategy; explicit for UI */
    extraction_strategy: SectionDetectionResult["strategy"];
  };
  research_extras?: Partial<
    Pick<
      ResearchPaperDeep,
      | "problem_statement"
      | "why_it_matters"
      | "datasets_or_benchmarks"
      | "metrics"
      | "missing_or_unclear_sections"
    >
  >;
  article?: ArticleDeep;
};

export type DocumentScanResult = {
  analysis: PaperAnalysis & { processing_model: string; confidence: string };
  scanMeta: ScanMeta;
  researchFacets: ResearchFacets;
};

function tryParseLenientJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const parsed = tryParseJson<unknown>(text);
  if (parsed.ok) return { ok: true, value: parsed.value };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, error: "No JSON object found in LLM output." };
  }
  const inner = tryParseJson<unknown>(text.slice(start, end + 1));
  if (!inner.ok) return { ok: false, error: inner.error };
  return { ok: true, value: inner.value };
}

function estimateTokens(text: string) {
  return Math.ceil((text?.length ?? 0) / 4);
}

function derivePaperConfidence(v: PaperAnalysis): "very_low" | "low" | "medium" | "high" {
  const fields = [
    v.abstract_or_overview,
    v.methodology,
    v.results,
    v.discussion,
    v.future_work,
  ];
  const filled = fields.filter((s) => (s ?? "").trim().length > 40).length;
  if (filled >= 5) return "high";
  if (filled >= 4) return "medium";
  if (filled >= 2) return "low";
  return "very_low";
}

function guessTitle(text: string) {
  const line = text
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.length > 8);
  return line?.slice(0, 140) ?? "Untitled";
}

function researchDeepToFacets(d: ResearchPaperDeep): ResearchFacets {
  return {
    methods: (d.methods_mentioned ?? []).slice(0, 24),
    datasets: (d.datasets_or_benchmarks ?? []).slice(0, 24),
    performance_level: d.performance_level ?? "unclear",
    core_contribution: (d.core_contribution_one_liner ?? "").slice(0, 500),
    key_result: (d.key_result_one_liner ?? "").slice(0, 500),
  };
}

function researchDeepToPaperAnalysis(d: ResearchPaperDeep): PaperAnalysis {
  const methodologyParts = [d.methodology?.trim(), d.experimental_setup?.trim()].filter(Boolean);
  return {
    title: d.title,
    authors: (d.authors ?? []).join(", "),
    abstract_or_overview: d.executive_summary,
    methodology: methodologyParts.join("\n\n") || "",
    results: d.results,
    discussion: d.discussion,
    future_work: d.limitations_future_work,
    key_takeaways: d.what_to_remember ?? [],
    keywords: d.keywords ?? [],
    important_concepts: [
      ...(d.important_concepts ?? []),
      ...(d.datasets_or_benchmarks ?? []).map((x) => `[dataset] ${x}`),
      ...(d.metrics ?? []).map((x) => `[metric] ${x}`),
    ].slice(0, 40),
    confidence_notes: d.confidence_notes,
  };
}

function articleDeepToPaperAnalysis(d: ArticleDeep): PaperAnalysis {
  const discussionParts = [
    d.main_argument?.trim() && `Main argument\n${d.main_argument}`,
    d.important_nuances?.trim() && `Nuances\n${d.important_nuances}`,
    d.implications?.trim() && `Implications\n${d.implications}`,
  ].filter(Boolean);

  return {
    title: d.title,
    authors: "",
    abstract_or_overview: d.executive_summary,
    methodology:
      "This content was analyzed as a general article (not a formal research paper). Methodology / experiments sections do not apply unless explicitly present in the source.",
    results:
      (d.evidence_examples ?? []).length > 0
        ? (d.evidence_examples ?? []).map((e, i) => `${i + 1}. ${e}`).join("\n\n")
        : "",
    discussion: discussionParts.join("\n\n"),
    future_work: "",
    key_takeaways: (d.key_points?.length ? d.key_points : d.what_to_remember) ?? [],
    keywords: d.keywords ?? [],
    important_concepts: (d.keywords ?? []).slice(0, 20),
    confidence_notes: d.confidence_notes,
  };
}

function placeholderAnalysis(paperText: string, msg: string): PaperAnalysis {
  const excerpt = paperText.trim().slice(0, 1200);
  return {
    title: guessTitle(excerpt),
    authors: "",
    abstract_or_overview: excerpt ? excerpt.slice(0, 400) : "",
    methodology: "Not yet analyzed (LLM provider not configured).",
    results: "Not yet analyzed (LLM provider not configured).",
    discussion: "Not yet analyzed (LLM provider not configured).",
    future_work: "Not yet analyzed (LLM provider not configured).",
    key_takeaways: [],
    keywords: [],
    important_concepts: [],
    confidence_notes: msg,
  };
}

export async function runDocumentScan(input: {
  paperText: string;
  sourceUrl?: string | null;
  isPdf?: boolean;
}): Promise<DocumentScanResult> {
  const sectionDetection = detectSections(input.paperText);
  const classification = classifyContentType(input.paperText, {
    sourceUrl: input.sourceUrl,
    isPdf: input.isPdf,
  });

  const sectionHintsJson = JSON.stringify(
    {
      strategy: sectionDetection.strategy,
      confidence: sectionDetection.confidence,
      matched_headings: sectionDetection.matched_headings,
      snippets: sectionDetection.snippets,
    },
    null,
    2
  );

  const scanMetaBase: ScanMeta = {
    content_type:
      classification.primary === "article"
        ? "article"
        : classification.primary === "research_paper"
          ? "research_paper"
          : "unknown",
    classification: {
      primary: classification.primary,
      confidence: classification.confidence,
      rationale: classification.rationale,
      scores: classification.scores,
    },
    section_detection: {
      ...sectionDetection,
      extraction_strategy: sectionDetection.strategy,
    },
  };

  let messages: ChatMessage[];
  let parser: (
    raw: string
  ) =>
    | { ok: true; paper: PaperAnalysis; extra: ScanMeta; researchFacets: ResearchFacets }
    | { ok: false; error: string };

  if (classification.primary === "article") {
    messages = buildArticleDeepScanPrompt({ paperText: input.paperText });
    parser = (raw) => {
      const j = tryParseLenientJson(raw);
      if (!j.ok) return { ok: false, error: j.error };
      const v = ArticleDeepSchema.safeParse(j.value);
      if (!v.success) return { ok: false, error: v.error.issues.map((i) => i.message).join("; ") };
      const article = v.data;
      return {
        ok: true,
        paper: articleDeepToPaperAnalysis(article),
        extra: {
          ...scanMetaBase,
          content_type: "article",
          article,
        },
        researchFacets: {
          methods: (article.keywords ?? []).slice(0, 8),
          datasets: [],
          performance_level: "unclear",
          core_contribution: (article.main_argument ?? "").slice(0, 400),
          key_result: "",
        },
      };
    };
  } else {
    const unknownNote =
      classification.primary === "unknown"
        ? "\n\nNote: Automated classification was uncertain—still extract the best research-style summary, and explain uncertainty in confidence_notes."
        : "";
    const base = buildResearchPaperDeepScanPrompt({
      paperText: input.paperText,
      sectionHintsJson: sectionHintsJson + unknownNote,
    });
    messages = base.map((m, i) =>
      i === 0
        ? { ...m, content: m.content + unknownNote }
        : m
    );
    parser = (raw) => {
      const j = tryParseLenientJson(raw);
      if (!j.ok) return { ok: false, error: j.error };
      const v = ResearchPaperDeepSchema.safeParse(j.value);
      if (!v.success) return { ok: false, error: v.error.issues.map((i) => i.message).join("; ") };
      const d = v.data;
      const research_extras: ScanMeta["research_extras"] = {
        problem_statement: d.problem_statement,
        why_it_matters: d.why_it_matters,
        datasets_or_benchmarks: d.datasets_or_benchmarks,
        metrics: d.metrics,
        missing_or_unclear_sections: d.missing_or_unclear_sections,
      };
      return {
        ok: true,
        paper: researchDeepToPaperAnalysis(d),
        extra: {
          ...scanMetaBase,
          content_type: classification.primary === "unknown" ? "unknown" : "research_paper",
          research_extras,
        },
        researchFacets: researchDeepToFacets(d),
      };
    };
  }

  const router = buildDefaultProviderRouter();
  const estimatedTokens = estimateTokens(input.paperText);

  try {
    const { result } = await router.chat({
      messages,
      estimatedTokens,
    });

    const parsed = parser(result.outputText);
    if (!parsed.ok) {
      throw new Error(`LLM returned invalid JSON: ${parsed.error}`);
    }

    const conf = derivePaperConfidence(parsed.paper);

    return {
      analysis: {
        ...parsed.paper,
        processing_model: `${result.provider}:${result.model}`,
        confidence: conf,
      },
      scanMeta: parsed.extra,
      researchFacets: parsed.researchFacets,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown LLM error";
    const draft = placeholderAnalysis(input.paperText, `LLM call failed; falling back to local placeholder.\n\nError: ${msg}`);
    return {
      analysis: {
        ...draft,
        processing_model: "local-placeholder",
        confidence: input.paperText.trim() ? "low" : "very_low",
      },
      scanMeta: {
        ...scanMetaBase,
        classification: {
          ...scanMetaBase.classification,
          rationale: scanMetaBase.classification.rationale + ` Placeholder: ${msg}`,
        },
      },
      researchFacets: defaultResearchFacets(),
    };
  }
}
