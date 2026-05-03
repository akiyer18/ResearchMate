import { z } from "zod";

export const WritingSupportSchema = z.object({
  literature_review_snippets: z.array(z.string()).catch([]),
  compare_contrast_paragraphs: z.array(z.string()).catch([]),
  thesis_ready_paragraph_drafts: z.array(z.string()).catch([]),
  how_this_supports_argument: z.array(z.string()).catch([]),
  citations_to_verify: z.array(z.string()).catch([]),
  confidence_notes: z.string().catch(""),
});

export type WritingSupport = z.infer<typeof WritingSupportSchema>;

export function buildWritingSupportPrompt(input: {
  project: {
    title: string;
    thesis_direction: string;
    objective: string;
    research_problem: string;
    research_questions: string[];
  };
  selected_papers: Array<{
    title: string;
    executive_summary: string;
    methodology_summary: string;
    results_summary: string;
    discussion_summary: string;
    future_work_summary: string;
    keywords: string[];
    important_concepts: string[];
  }>;
  intent: "literature_review" | "thesis_paragraph" | "compare_contrast" | "support_argument";
  tone: "academic" | "clear" | "compact";
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are a writing-support assistant for a serious research project.\n" +
        "Use the project's thesis direction and the provided paper summaries.\n" +
        "Return ONLY valid JSON with:\n" +
        "- literature_review_snippets (array)\n" +
        "- compare_contrast_paragraphs (array)\n" +
        "- thesis_ready_paragraph_drafts (array)\n" +
        "- how_this_supports_argument (array)\n" +
        "- citations_to_verify (array)\n" +
        "- confidence_notes\n\n" +
        "Guidelines:\n" +
        "- Do not invent citations or claims; mark items as 'to verify' when unclear.\n" +
        "- Keep paragraphs usable in a thesis draft.\n" +
        "- Prefer clarity over hype.\n",
    },
    {
      role: "user" as const,
      content:
        "PROJECT:\n" +
        JSON.stringify(input.project, null, 2) +
        "\n\nINTENT:\n" +
        input.intent +
        "\n\nTONE:\n" +
        input.tone +
        "\n\nSELECTED PAPER SUMMARIES:\n" +
        JSON.stringify(input.selected_papers, null, 2),
    },
  ];
}

