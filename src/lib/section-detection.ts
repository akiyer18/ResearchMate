/**
 * Hybrid section detection: heading synonyms + heuristics.
 * Output is passed to the LLM as hints; the model still reads full text.
 */

export type CanonicalSection =
  | "abstract_or_overview"
  | "methodology"
  | "results"
  | "discussion"
  | "limitations_future_work"
  | "conclusion";

export type SectionDetectionStrategy = "header_match" | "semantic_inference" | "hybrid" | "none";

export type SectionDetectionResult = {
  strategy: SectionDetectionStrategy;
  confidence: "high" | "medium" | "low";
  /** Normalized heading lines matched per canonical bucket */
  matched_headings: Record<CanonicalSection, string[]>;
  /** Short excerpts after each matched heading (trimmed) */
  snippets: Partial<Record<CanonicalSection, string>>;
};

const SYNONYMS: Array<{ bucket: CanonicalSection; patterns: RegExp[] }> = [
  {
    bucket: "abstract_or_overview",
    patterns: [
      /^abstract$/i,
      /^summary$/i,
      /^overview$/i,
    ],
  },
  {
    bucket: "methodology",
    patterns: [
      /^methods?$/i,
      /^materials and methods$/i,
      /^experimental setup$/i,
      /^study design$/i,
      /^proposed approach$/i,
      /^framework$/i,
      /^model$/i,
      /^approach$/i,
      /^implementation$/i,
    ],
  },
  {
    bucket: "results",
    patterns: [
      /^results?$/i,
      /^findings$/i,
      /^empirical results$/i,
      /^experiments?$/i,
      /^experimental evaluation$/i,
      /^evaluation$/i,
      /^observations?$/i,
    ],
  },
  {
    bucket: "discussion",
    patterns: [
      /^discussion$/i,
      /^analysis$/i,
      /^interpretation$/i,
      /^error analysis$/i,
    ],
  },
  {
    bucket: "limitations_future_work",
    patterns: [
      /^limitations?$/i,
      /^future work$/i,
      /^future directions?$/i,
      /^conclusion and future work$/i,
      /^threats to validity$/i,
    ],
  },
  {
    bucket: "conclusion",
    patterns: [
      /^conclusions?$/i,
      /^concluding remarks$/i,
      /^closing$/i,
    ],
  },
];

function normalizeHeading(line: string) {
  return line
    .replace(/^\s*#+\s*/, "")
    .replace(/^\s*\d+\.?\s+/, "")
    .trim();
}

function looksLikeHeading(line: string) {
  const t = line.trim();
  if (t.length < 3 || t.length > 120) return false;
  if (/^#{1,3}\s+\S/.test(t)) return true;
  // ALL CAPS short
  if (t === t.toUpperCase() && t.length < 80 && /[A-Z]/.test(t)) return true;
  // Numbered section
  if (/^\d+(\.\d+)*\s+[A-Za-z]/.test(t)) return true;
  return /^[A-Z][a-zA-Z0-9 ,/&\-]{2,70}$/.test(t);
}

function matchBucket(heading: string): CanonicalSection | null {
  for (const { bucket, patterns } of SYNONYMS) {
    for (const p of patterns) {
      if (p.test(heading)) return bucket;
    }
  }
  // fuzzy contains
  const h = heading.toLowerCase();
  if (/\bmethod|experiment|setup|framework|approach\b/.test(h) && h.length < 90) return "methodology";
  if (/\bresult|finding|evaluation|ablation\b/.test(h) && h.length < 90) return "results";
  if (/\bdiscuss|analysis|interpret\b/.test(h) && h.length < 90) return "discussion";
  if (/\blimitation|future work|future direction\b/.test(h)) return "limitations_future_work";
  if (/\bconclusion\b/.test(h)) return "conclusion";
  if (/\babstract|summary\b/.test(h)) return "abstract_or_overview";
  return null;
}

function excerptAfter(lines: string[], startIdx: number, maxLen: number) {
  const parts: string[] = [];
  let len = 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const raw = lines[i]?.trim() ?? "";
    if (!raw) continue;
    if (looksLikeHeading(raw) && matchBucket(normalizeHeading(raw))) break;
    parts.push(raw);
    len += raw.length;
    if (len >= maxLen) break;
  }
  return parts.join("\n").slice(0, maxLen).trim();
}

export function detectSections(rawText: string): SectionDetectionResult {
  const lines = rawText.split(/\r?\n/);
  const matched_headings: Record<CanonicalSection, string[]> = {
    abstract_or_overview: [],
    methodology: [],
    results: [],
    discussion: [],
    limitations_future_work: [],
    conclusion: [],
  };
  const snippets: Partial<Record<CanonicalSection, string>> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!looksLikeHeading(line)) continue;
    const h = normalizeHeading(line);
    const bucket = matchBucket(h);
    if (!bucket) continue;
    matched_headings[bucket].push(h);
    if (!snippets[bucket]) {
      const ex = excerptAfter(lines, i, 900);
      if (ex) snippets[bucket] = ex;
    }
  }

  const distinct = (Object.keys(matched_headings) as CanonicalSection[]).filter(
    (k) => matched_headings[k].length > 0
  ).length;

  let strategy: SectionDetectionStrategy = "none";
  if (distinct >= 3) strategy = "header_match";
  else if (distinct >= 1) strategy = "hybrid";
  else strategy = "semantic_inference";

  let confidence: SectionDetectionResult["confidence"] = "low";
  if (distinct >= 4) confidence = "high";
  else if (distinct >= 2) confidence = "medium";

  return {
    strategy,
    confidence,
    matched_headings,
    snippets,
  };
}
