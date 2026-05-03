import { z } from "zod";

import type { ArchiveQuery } from "@/services/repositories/paper-repo";
import { PERFORMANCE_LEVELS, type PerformanceLevel } from "@/types/research-facets";

const ConfidenceLevel = z.enum(["very_low", "low", "medium", "high"]);
const Sort = z.enum(["created_desc", "opened_desc", "title_asc"]);
const SourceType = z.enum(["pdf", "url", "text", "all"]);

function commaStrings(s: string | undefined): string[] | undefined {
  if (!s?.trim()) return undefined;
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export const ArchiveQuerySchema = z.object({
  q: z.string().optional(),
  sourceType: SourceType.optional(),
  topic: z.string().optional(),
  keyword: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  methods: z.string().optional().transform(commaStrings),
  datasets: z.string().optional().transform(commaStrings),
  performanceLevels: z
    .string()
    .optional()
    .transform((s) => {
      const arr = commaStrings(s);
      if (!arr) return undefined;
      return arr
        .map((x) => x.toLowerCase())
        .filter((x): x is PerformanceLevel =>
          (PERFORMANCE_LEVELS as readonly string[]).includes(x)
        );
    }),
  confidenceLevels: z
    .string()
    .optional()
    .transform((s) => {
      const arr = commaStrings(s);
      if (!arr) return undefined;
      const out: Array<z.infer<typeof ConfidenceLevel>> = [];
      for (const x of arr) {
        const p = ConfidenceLevel.safeParse(x.toLowerCase());
        if (p.success) out.push(p.data);
      }
      return out.length ? out : undefined;
    }),
  sort: Sort.optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export function parseArchiveQueryFromUrl(url: URL): ArchiveQuery {
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = ArchiveQuerySchema.safeParse(raw);
  if (!parsed.success) return {};
  const d = parsed.data;
  return {
    q: d.q,
    sourceType: d.sourceType,
    topic: d.topic,
    keyword: d.keyword,
    fromDate: d.fromDate,
    toDate: d.toDate,
    methods: d.methods,
    datasets: d.datasets,
    performanceLevels: d.performanceLevels?.length ? d.performanceLevels : undefined,
    confidenceLevels: d.confidenceLevels?.length ? d.confidenceLevels : undefined,
    sort: d.sort,
    limit: d.limit,
    offset: d.offset,
  };
}
