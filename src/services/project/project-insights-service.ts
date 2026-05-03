import type { PaperAnalysis } from "@/prompts/paper-analysis";
import type { ProjectRecord } from "@/types/projects";
import { buildProjectInsightsPrompt, ProjectInsightsSchema } from "@/prompts/project-insights";
import { tryParseJson } from "@/lib/json";
import { RelatedPapersService } from "@/services/project/related-papers";
import type { PaperSummaryRecord } from "@/types/papers";
import { buildDefaultProviderRouter } from "@/services/llm/router-factory";

/**
 * Local-first behavior:
 * - Uses deterministic related-paper matching (keyword/concept overlap)
 * - If an LLM provider is configured, generates structured insights via prompt + schema
 * - Falls back to placeholder if the LLM call fails
 */
export class ProjectInsightsService {
  private readonly related = new RelatedPapersService();

  async generate(input: {
    project: ProjectRecord;
    reading_intent: string;
    output_depth: "quick" | "standard" | "deep";
    newPaper: PaperAnalysis;
    existingProjectPapers: PaperSummaryRecord[];
  }) {
    const matches = this.related.matchRelatedPapers({
      newPaper: {
        keywords: input.newPaper.keywords ?? [],
        importantConcepts: input.newPaper.important_concepts ?? [],
        title: input.newPaper.title ?? "",
      },
      existing: input.existingProjectPapers.map((p) => ({
        id: p.id,
        paper_title: p.paper_title,
        executive_summary: p.executive_summary,
        keywords: p.keywords,
        important_concepts: p.important_concepts,
      })),
      max: 6,
    });

    // Prepare prompt (for later router integration)
    const _messages = buildProjectInsightsPrompt({
      project: {
        title: input.project.title,
        description: input.project.description,
        objective: input.project.objective,
        thesis_direction: input.project.thesis_direction,
        research_problem: input.project.research_problem,
        research_questions: input.project.research_questions,
        methodology_direction: input.project.methodology_direction,
        implementation_goal: input.project.implementation_goal,
        primary_topics: input.project.primary_topics,
        preferred_methods: input.project.preferred_methods,
        preferred_datasets: input.project.preferred_datasets,
        preferred_metrics: input.project.preferred_metrics,
        notes_summary: input.project.notes_summary,
      },
      reading_intent: input.reading_intent,
      output_depth: input.output_depth,
      new_paper_summary: {
        title: input.newPaper.title ?? "",
        authors: input.newPaper.authors ?? "",
        abstract_or_overview: input.newPaper.abstract_or_overview ?? "",
        methodology: input.newPaper.methodology ?? "",
        results: input.newPaper.results ?? "",
        discussion: input.newPaper.discussion ?? "",
        future_work: input.newPaper.future_work ?? "",
        key_takeaways: input.newPaper.key_takeaways ?? [],
        keywords: input.newPaper.keywords ?? [],
        important_concepts: input.newPaper.important_concepts ?? [],
        confidence_notes: input.newPaper.confidence_notes ?? "",
      },
      related_project_papers: input.existingProjectPapers.slice(0, 12).map((p) => ({
        paper_summary_id: p.id,
        title: p.paper_title,
        executive_summary: p.executive_summary,
        keywords: p.keywords,
        important_concepts: p.important_concepts,
      })),
    });

    const placeholderBase = {
      relevance_explanation:
        "Local placeholder (LLM not configured): This paper appears potentially relevant based on overlap with your project's topics and stored keywords. Configure an LLM provider to generate deep, project-specific reasoning.",
      project_fit_summary:
        "Place this paper tentatively as supporting context until deeper analysis is available.",
      fit_area: "literature review / background",

      thesis_usefulness:
        "Use for framing and literature review context; validate alignment once methods/results are extracted more fully.",
      methodology_usefulness:
        "Unknown yet—method details not evaluated by an LLM. Review the methodology section.",
      implementation_usefulness:
        "Unknown yet—extract concrete techniques/datasets/metrics after configuring an LLM provider.",
      literature_review_usefulness:
        "Likely useful for positioning; capture key claims and compare to your current framing.",
      discussion_usefulness:
        "Review discussion to identify assumptions and limitations relevant to your thesis direction.",
      future_work_usefulness:
        "Look for limitations/open questions that match your research questions.",

      related_project_papers: matches.map((m) => ({
        paper_summary_id: m.paper_summary_id,
        title: m.title,
        relation: m.relation,
        why_related: m.why_related,
      })),

      improvement_suggestions: [
        "Add 1–2 explicit success metrics to your project definition (preferred_metrics).",
        "Clarify whether your project optimizes for quality, latency, cost, or robustness.",
      ],
      gaps_identified: ["Need LLM-enabled extraction of methods/datasets/metrics for stronger fit assessment."],
      contradictions_or_risks: ["Potential mismatch between paper scope and project goal—requires confirmation."],
      recommended_actions: [
        "Skim methodology + results and extract datasets/metrics.",
        "Compare keywords/concepts with your top project papers.",
        "Decide whether this is core/supporting/peripheral for your literature review.",
      ],
      recommended_thesis_sections: ["literature review", "background"],
      priority_level: matches.length ? "supporting" : "optional",
      confidence_notes:
        "This is a deterministic placeholder based on keyword/concept overlap. Enable an LLM provider for thesis-aware reasoning and risk detection.",
    };

    try {
      const router = buildDefaultProviderRouter();
      const estimatedTokens = estimateTokens(
        `${input.project.title}\n${input.project.thesis_direction}\n${input.newPaper.title}\n${input.newPaper.abstract_or_overview}`
      );

      const { result } = await router.chat({
        messages: _messages,
        estimatedTokens,
      });

      const parsed = tryParseJson<unknown>(result.outputText);
      const lenient = parsed.ok ? parsed : tryParseLenientJson(result.outputText);
      if (!lenient.ok) throw new Error(`LLM returned invalid JSON: ${lenient.error}`);

      const validated = ProjectInsightsSchema.safeParse(lenient.value);
      if (!validated.success) {
        throw new Error(
          `Project insights schema validation failed: ${validated.error.issues
            .map((i) => i.message)
            .join("; ")}`
        );
      }

      return {
        insights: validated.data,
        related: matches,
        messages: _messages,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown LLM error";
      const fallback = {
        ...placeholderBase,
        confidence_notes:
          placeholderBase.confidence_notes + `\n\nLLM call failed: ${msg}`,
      };

      const parsed = ProjectInsightsSchema.safeParse(fallback);
      if (!parsed.success) {
        // Should never happen, but keep it safe.
        return {
          insights: ProjectInsightsSchema.parse(placeholderBase),
          related: matches,
          messages: _messages,
        };
      }

      return { insights: parsed.data, related: matches, messages: _messages };
    }
  }
}

function estimateTokens(text: string) {
  // Very rough heuristic: ~4 chars per token.
  return Math.ceil((text?.length ?? 0) / 4);
}

function tryParseLenientJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  // Common failure mode: code fences or extra prose around the JSON object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, error: "No JSON object found in LLM output." };
  }

  const candidate = text.slice(start, end + 1);
  const parsed = tryParseJson<unknown>(candidate);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, value: parsed.value };
}

