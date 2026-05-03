import { z } from "zod";

export const PERFORMANCE_LEVELS = ["sota", "strong", "moderate", "weak", "unclear"] as const;
export type PerformanceLevel = (typeof PERFORMANCE_LEVELS)[number];

export const ResearchFacetsSchema = z.object({
  methods: z.array(z.string()).catch([]),
  datasets: z.array(z.string()).catch([]),
  performance_level: z.enum(PERFORMANCE_LEVELS).catch("unclear"),
  core_contribution: z.string().catch(""),
  key_result: z.string().catch(""),
});

export type ResearchFacets = z.infer<typeof ResearchFacetsSchema>;

export const defaultResearchFacets = (): ResearchFacets => ({
  methods: [],
  datasets: [],
  performance_level: "unclear",
  core_contribution: "",
  key_result: "",
});

export const StructuredPaperNotesSchema = z.object({
  idea: z.string().catch(""),
  critique: z.string().catch(""),
  use_in_project: z.string().catch(""),
  open_questions: z.string().catch(""),
  follow_up_tasks: z.string().catch(""),
});

export type StructuredPaperNotes = z.infer<typeof StructuredPaperNotesSchema>;

export const defaultStructuredNotes = (): StructuredPaperNotes => ({
  idea: "",
  critique: "",
  use_in_project: "",
  open_questions: "",
  follow_up_tasks: "",
});

export function parseResearchFacets(raw: string | null | undefined): ResearchFacets {
  if (!raw?.trim()) return defaultResearchFacets();
  try {
    const v = JSON.parse(raw) as unknown;
    const p = ResearchFacetsSchema.safeParse(v);
    return p.success ? p.data : defaultResearchFacets();
  } catch {
    return defaultResearchFacets();
  }
}

export function parseStructuredNotes(raw: string | null | undefined): StructuredPaperNotes {
  if (!raw?.trim()) return defaultStructuredNotes();
  try {
    const v = JSON.parse(raw) as unknown;
    const p = StructuredPaperNotesSchema.safeParse(v);
    return p.success ? p.data : defaultStructuredNotes();
  } catch {
    return defaultStructuredNotes();
  }
}
