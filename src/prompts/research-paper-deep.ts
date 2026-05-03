import { z } from "zod";

export const ResearchPaperDeepSchema = z.object({
  title: z.string().catch(""),
  authors: z.array(z.string()).catch([]),
  content_type: z.literal("research_paper").catch("research_paper"),
  executive_summary: z.string().catch(""),
  problem_statement: z.string().catch(""),
  why_it_matters: z.string().catch(""),
  methodology: z.string().catch(""),
  experimental_setup: z.string().catch(""),
  results: z.string().catch(""),
  discussion: z.string().catch(""),
  limitations_future_work: z.string().catch(""),
  what_to_remember: z.array(z.string()).catch([]),
  important_concepts: z.array(z.string()).catch([]),
  datasets_or_benchmarks: z.array(z.string()).catch([]),
  metrics: z.array(z.string()).catch([]),
  keywords: z.array(z.string()).catch([]),
  confidence_notes: z.string().catch(""),
  missing_or_unclear_sections: z.array(z.string()).catch([]),
  methods_mentioned: z.array(z.string()).catch([]),
  performance_level: z
    .enum(["sota", "strong", "moderate", "weak", "unclear"])
    .catch("unclear"),
  core_contribution_one_liner: z.string().catch(""),
  key_result_one_liner: z.string().catch(""),
});

export type ResearchPaperDeep = z.infer<typeof ResearchPaperDeepSchema>;

export function buildResearchPaperDeepScanPrompt(input: {
  paperText: string;
  sectionHintsJson: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are analyzing an academic paper for a serious researcher who wants the value of one intelligent read-through in much less time.\n\n" +
        "Read the provided text carefully and extract information that matters for research utility—not generic summarization.\n\n" +
        "Return ONLY a single valid JSON object with these fields:\n" +
        "- title (string)\n" +
        "- authors (string[])\n" +
        '- content_type: must be exactly "research_paper"\n' +
        "- executive_summary (string)\n" +
        "- problem_statement (string)\n" +
        "- why_it_matters (string)\n" +
        "- methodology (string)\n" +
        "- experimental_setup (string)\n" +
        "- results (string)\n" +
        "- discussion (string)\n" +
        "- limitations_future_work (string)\n" +
        "- what_to_remember (string[])\n" +
        "- important_concepts (string[])\n" +
        "- datasets_or_benchmarks (string[])\n" +
        "- metrics (string[])\n" +
        "- keywords (string[])\n" +
        "- confidence_notes (string)\n" +
        "- missing_or_unclear_sections (string[])\n" +
        "- methods_mentioned (string[]): concrete method families named in the paper (e.g. Transformer, CNN, RL, Diffusion, GNN). Use short canonical tags.\n" +
        '- performance_level: one of "sota","strong","moderate","weak","unclear" — how strong claimed results are vs prior work, based only on the text.\n' +
        "- core_contribution_one_liner (string): single sentence main contribution.\n" +
        "- key_result_one_liner (string): headline quantitative or qualitative outcome if any; else empty string.\n\n" +
        "Rules:\n" +
        "- Do not hallucinate datasets, metrics, or numbers not supported by the text.\n" +
        "- If section headings are unusual, infer content from context.\n" +
        "- If something is missing or ambiguous, list it in missing_or_unclear_sections and explain briefly in confidence_notes.\n" +
        "- Be concise but information-dense.\n" +
        "- No markdown, no prose outside JSON.",
    },
    {
      role: "user" as const,
      content:
        "PRE-ANALYSIS SECTION HINTS (from automated heading detection; may be incomplete—still read the full text):\n" +
        input.sectionHintsJson +
        "\n\n---\n\nFULL TEXT:\n\n" +
        input.paperText,
    },
  ];
}
