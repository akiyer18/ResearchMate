import { z } from "zod";

export const PaperAnalysisSchema = z.object({
  title: z.string().catch(""),
  authors: z.string().catch(""),
  abstract_or_overview: z.string().catch(""),
  methodology: z.string().catch(""),
  results: z.string().catch(""),
  discussion: z.string().catch(""),
  future_work: z.string().catch(""),
  key_takeaways: z.array(z.string()).catch([]),
  keywords: z.array(z.string()).catch([]),
  important_concepts: z.array(z.string()).catch([]),
  confidence_notes: z.string().catch(""),
});

export type PaperAnalysis = z.infer<typeof PaperAnalysisSchema>;

export function buildPaperAnalysisPrompt(input: { paperText: string }) {
  return [
    {
      role: "system" as const,
      content:
        "You are analyzing an academic paper for a serious reader who wants the value of one strong scan.\n\n" +
        "Read the provided paper text and extract the most important information.\n\n" +
        "Return a structured JSON object with:\n" +
        "- title\n" +
        "- authors\n" +
        "- abstract_or_overview\n" +
        "- methodology\n" +
        "- results\n" +
        "- discussion\n" +
        "- future_work\n" +
        "- key_takeaways (array)\n" +
        "- keywords (array)\n" +
        "- important_concepts (array)\n" +
        "- confidence_notes\n\n" +
        "Guidelines:\n" +
        "- Be accurate and concise\n" +
        "- If some sections are missing or unclear, say so\n" +
        "- Prioritize what a careful reader should retain after one good read-through\n" +
        "- Focus especially on methodology, results, discussion, and future work\n" +
        "- Summaries should be informative, not vague\n" +
        "- Keywords should be conceptually useful for future retrieval\n" +
        "- Important concepts should capture models, techniques, datasets, benchmarks, or core ideas\n" +
        "- Avoid hallucinating details not supported by the text\n\n" +
        "Return ONLY valid JSON. No markdown. No surrounding text.",
    },
    {
      role: "user" as const,
      content:
        "PAPER TEXT (may be partial; handle missing sections gracefully):\n\n" +
        input.paperText,
    },
  ];
}

