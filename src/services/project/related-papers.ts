import type { PaperSummaryRecord } from "@/types/papers";

type LightweightPaper = Pick<
  PaperSummaryRecord,
  "id" | "paper_title" | "executive_summary" | "keywords" | "important_concepts"
>;

function toSet(values: string[]) {
  return new Set(
    (values ?? [])
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 64)
  );
}

function overlapScore(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return hit / Math.sqrt(a.size * b.size);
}

export type RelatedPaperMatch = {
  paper_summary_id: string;
  title: string;
  score: number;
  relation: "complementary" | "similar" | "contrasting";
  why_related: string;
};

export class RelatedPapersService {
  matchRelatedPapers(input: {
    newPaper: { keywords: string[]; importantConcepts: string[]; title: string };
    existing: LightweightPaper[];
    max?: number;
  }): RelatedPaperMatch[] {
    const max = Math.min(Math.max(input.max ?? 5, 1), 10);

    const newK = toSet(input.newPaper.keywords);
    const newC = toSet(input.newPaper.importantConcepts);

    const scored = input.existing
      .map((p) => {
        const pk = toSet(p.keywords ?? []);
        const pc = toSet(p.important_concepts ?? []);
        const score = 0.65 * overlapScore(newK, pk) + 0.35 * overlapScore(newC, pc);
        return { p, score };
      })
      .filter((x) => x.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);

    return scored.map(({ p, score }) => {
      const relation: RelatedPaperMatch["relation"] =
        score > 0.32 ? "similar" : score > 0.18 ? "complementary" : "contrasting";

      const why =
        relation === "similar"
          ? "High overlap in keywords/concepts."
          : relation === "complementary"
            ? "Some overlap; likely supports adjacent parts of the project."
            : "Low overlap; could offer alternative framing or a contrasting approach.";

      return {
        paper_summary_id: p.id,
        title: p.paper_title,
        score: Number(score.toFixed(3)),
        relation,
        why_related: why,
      };
    });
  }
}

