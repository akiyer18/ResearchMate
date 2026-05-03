import type { ChatMessage } from "@/services/llm/types";

export function buildLiteratureReviewDraftPrompt(input: {
  projectTitle: string;
  thesisDirection: string;
  objective: string;
  papersBundle: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are helping a PhD-level researcher draft a structured literature review section using ONLY the paper summaries provided.\n" +
        "Rules:\n" +
        "- Ground every theme in the supplied summaries; if something is not supported, say it is unclear from the provided texts.\n" +
        "- Use clear markdown with headings (##, ###).\n" +
        "- Include a final section 'Sources in this draft' listing paper titles from the bundle.\n" +
        "- Do not invent citations, venues, or years not present in the input.\n" +
        "- Output markdown only.",
    },
    {
      role: "user",
      content:
        `Project: ${input.projectTitle}\n` +
        `Thesis direction: ${input.thesisDirection}\n` +
        `Objective: ${input.objective}\n\n` +
        "Produce a literature review draft with sections:\n" +
        "## Introduction / problem framing\n" +
        "## Major themes\n" +
        "## Methods compared\n" +
        "## Key findings\n" +
        "## Gaps and limitations\n" +
        "## Relevance to this project\n" +
        "## Sources in this draft\n\n" +
        "--- PAPER SUMMARIES ---\n\n" +
        input.papersBundle,
    },
  ];
}
