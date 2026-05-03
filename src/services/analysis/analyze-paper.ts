import type { ChatMessage } from "@/services/llm/types";
import { PaperAnalysisSchema, type PaperAnalysis } from "@/prompts/paper-analysis";
import { tryParseJson } from "@/lib/json";
import { buildDefaultProviderRouter } from "@/services/llm/router-factory";

/**
 * Local-first MVP behavior:
 * - If no LLM provider is configured yet, return a best-effort placeholder analysis
 *   so the Scanner module can be built end-to-end with the local DB.
 * - Once provider router is implemented, this function will call it and validate JSON.
 */
export async function analyzePaperText(input: {
  paperText: string;
  messages: ChatMessage[];
}): Promise<PaperAnalysis & { processing_model: string; confidence: string }> {
  const router = buildDefaultProviderRouter();
  const estimatedTokens = estimateTokens(input.paperText);

  try {
    const { result } = await router.chat({
      messages: input.messages,
      estimatedTokens,
    });

    const parsed = parseAndValidatePaperAnalysis(result.outputText);
    if (!parsed.ok) {
      throw new Error(`LLM returned invalid JSON: ${parsed.error}`);
    }

    // Derive a coarse confidence signal based on completeness.
    const conf = deriveConfidence(parsed.value);

    return {
      ...parsed.value,
      processing_model: `${result.provider}:${result.model}`,
      confidence: conf,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown LLM error";
    const excerpt = input.paperText.trim().slice(0, 1200);

    const draft: PaperAnalysis = {
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
      confidence_notes:
        "LLM call failed; falling back to local placeholder.\n\n" + `Error: ${msg}`,
    };

    return {
      ...draft,
      processing_model: "local-placeholder",
      confidence: excerpt ? "low" : "very_low",
    };
  }

  // Unreachable, but keep TypeScript satisfied if control flow changes.
  const excerpt = input.paperText.trim().slice(0, 1200);
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
    confidence_notes: "Local placeholder.",
    processing_model: "local-placeholder",
    confidence: excerpt ? "low" : "very_low",
  };
}

export function parseAndValidatePaperAnalysis(jsonText: string) {
  const parsed = tryParseJson<unknown>(jsonText);
  const value = parsed.ok
    ? ({ ok: true as const, value: parsed.value })
    : tryParseLenientJson(jsonText);
  if (!value.ok) return { ok: false as const, error: value.error };

  const validated = PaperAnalysisSchema.safeParse(value.value);
  if (!validated.success) {
    return {
      ok: false as const,
      error: validated.error.issues.map((i) => i.message).join("; "),
    };
  }

  return { ok: true as const, value: validated.data };
}

function tryParseLenientJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  // Common LLM failure mode: returns extra prose or code fences around JSON.
  // Attempt to extract the largest {...} block and parse it.
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

function guessTitle(text: string) {
  const line = text.split("\n").map((s) => s.trim()).find((s) => s.length > 8);
  return line?.slice(0, 140) ?? "Untitled paper";
}

function estimateTokens(text: string) {
  // Very rough heuristic: ~4 chars per token.
  return Math.ceil((text?.length ?? 0) / 4);
}

function deriveConfidence(v: PaperAnalysis): "very_low" | "low" | "medium" | "high" {
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

