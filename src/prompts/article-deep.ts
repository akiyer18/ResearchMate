import { z } from "zod";

export const ArticleDeepSchema = z.object({
  title: z.string().catch(""),
  content_type: z.literal("article").catch("article"),
  executive_summary: z.string().catch(""),
  main_argument: z.string().catch(""),
  key_points: z.array(z.string()).catch([]),
  evidence_examples: z.array(z.string()).catch([]),
  important_nuances: z.string().catch(""),
  implications: z.string().catch(""),
  what_to_remember: z.array(z.string()).catch([]),
  keywords: z.array(z.string()).catch([]),
  confidence_notes: z.string().catch(""),
});

export type ArticleDeep = z.infer<typeof ArticleDeepSchema>;

export function buildArticleDeepScanPrompt(input: { paperText: string }) {
  return [
    {
      role: "system" as const,
      content:
        "You are analyzing an article for a serious reader who wants the main value of reading it in a fraction of the time.\n\n" +
        "Return ONLY a single valid JSON object with:\n" +
        "- title (string)\n" +
        '- content_type: must be exactly "article"\n' +
        "- executive_summary (string)\n" +
        "- main_argument (string)\n" +
        "- key_points (string[])\n" +
        "- evidence_examples (string[])\n" +
        "- important_nuances (string)\n" +
        "- implications (string)\n" +
        "- what_to_remember (string[])\n" +
        "- keywords (string[])\n" +
        "- confidence_notes (string)\n\n" +
        "Instructions:\n" +
        "- Identify the main argument or main point.\n" +
        "- Extract the strongest supporting ideas.\n" +
        "- Note nuance, caveats, and tradeoffs.\n" +
        "- Do NOT force academic paper sections (methods/experiments) unless the article is clearly research.\n" +
        "- Do not hallucinate unsupported details.\n" +
        "- No markdown, no prose outside JSON.",
    },
    {
      role: "user" as const,
      content: "ARTICLE TEXT:\n\n" + input.paperText,
    },
  ];
}
