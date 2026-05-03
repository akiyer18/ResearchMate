import { z } from "zod";

export const ProjectInsightsSchema = z.object({
  relevance_explanation: z.string().catch(""),
  project_fit_summary: z.string().catch(""),
  fit_area: z.string().catch(""),

  thesis_usefulness: z.string().catch(""),
  methodology_usefulness: z.string().catch(""),
  implementation_usefulness: z.string().catch(""),
  literature_review_usefulness: z.string().catch(""),
  discussion_usefulness: z.string().catch(""),
  future_work_usefulness: z.string().catch(""),

  related_project_papers: z
    .array(
      z.object({
        paper_summary_id: z.string().catch(""),
        title: z.string().catch(""),
        relation: z.enum(["complementary", "similar", "contrasting"]).catch("similar"),
        why_related: z.string().catch(""),
      })
    )
    .catch([]),

  improvement_suggestions: z.array(z.string()).catch([]),
  gaps_identified: z.array(z.string()).catch([]),
  contradictions_or_risks: z.array(z.string()).catch([]),
  recommended_actions: z.array(z.string()).catch([]),
  recommended_thesis_sections: z.array(z.string()).catch([]),

  priority_level: z
    .enum(["high_priority", "supporting", "optional", "peripheral"])
    .catch("optional"),
  confidence_notes: z.string().catch(""),
});

export type ProjectInsights = z.infer<typeof ProjectInsightsSchema>;

export function buildProjectInsightsPrompt(input: {
  project: {
    title: string;
    description?: string;
    objective: string;
    thesis_direction: string;
    research_problem: string;
    research_questions: string[];
    methodology_direction: string;
    implementation_goal: string;
    primary_topics: string[];
    preferred_methods: string[];
    preferred_datasets: string[];
    preferred_metrics: string[];
    notes_summary?: string;
  };
  reading_intent: string;
  output_depth: "quick" | "standard" | "deep";
  new_paper_summary: {
    title: string;
    authors: string;
    abstract_or_overview: string;
    methodology: string;
    results: string;
    discussion: string;
    future_work: string;
    key_takeaways: string[];
    keywords: string[];
    important_concepts: string[];
    confidence_notes: string;
  };
  related_project_papers: Array<{
    paper_summary_id: string;
    title: string;
    executive_summary: string;
    keywords: string[];
    important_concepts: string[];
  }>;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are an Insights Engine for a thesis/project workspace.\n" +
        "Your job is to evaluate a newly scanned paper relative to the project's thesis direction and objectives.\n\n" +
        "Return ONLY valid JSON matching this shape:\n" +
        "{\n" +
        '  "relevance_explanation": string,\n' +
        '  "project_fit_summary": string,\n' +
        '  "fit_area": string,\n' +
        '  "thesis_usefulness": string,\n' +
        '  "methodology_usefulness": string,\n' +
        '  "implementation_usefulness": string,\n' +
        '  "literature_review_usefulness": string,\n' +
        '  "discussion_usefulness": string,\n' +
        '  "future_work_usefulness": string,\n' +
        '  "related_project_papers": [{ "paper_summary_id": string, "title": string, "relation": "complementary"|"similar"|"contrasting", "why_related": string }],\n' +
        '  "improvement_suggestions": string[],\n' +
        '  "gaps_identified": string[],\n' +
        '  "contradictions_or_risks": string[],\n' +
        '  "recommended_actions": string[],\n' +
        '  "recommended_thesis_sections": string[],\n' +
        '  "priority_level": "high_priority"|"supporting"|"optional"|"peripheral",\n' +
        '  "confidence_notes": string\n' +
        "}\n\n" +
        "Guidelines:\n" +
        "- Be concrete and project-specific.\n" +
        "- Do not hallucinate details not supported by the paper summary.\n" +
        "- Explicitly call out missing info.\n" +
        "- Focus on methodology/implementation/evaluation relevance.\n" +
        "- Recommend next actions the researcher can take.\n",
    },
    {
      role: "user" as const,
      content:
        "PROJECT CONTEXT:\n" +
        JSON.stringify(input.project, null, 2) +
        "\n\nREADING INTENT:\n" +
        input.reading_intent +
        "\n\nOUTPUT DEPTH:\n" +
        input.output_depth +
        "\n\nNEW PAPER SUMMARY:\n" +
        JSON.stringify(input.new_paper_summary, null, 2) +
        "\n\nRELATED PROJECT PAPERS (lightweight):\n" +
        JSON.stringify(input.related_project_papers, null, 2),
    },
  ];
}

