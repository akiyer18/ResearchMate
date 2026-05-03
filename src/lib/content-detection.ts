/**
 * Lightweight heuristic classifier: research paper vs general article vs unknown.
 * Does not call an LLM — used to pick prompt shape and UI labels.
 */

export type ContentKind = "research_paper" | "article" | "unknown";

export type ContentClassification = {
  primary: ContentKind;
  confidence: "high" | "medium" | "low";
  /** Short explanation for scan metadata / debugging */
  rationale: string;
  scores: { paper: number; article: number };
};

const PAPER_HINTS = [
  /\babstract\b/i,
  /\bintroduction\b/i,
  /\breferences\b/i,
  /\brelated work\b/i,
  /\bmethodology\b|\bmethods\b|\bmaterials and methods\b/i,
  /\bexperimental (setup|evaluation|results)\b/i,
  /\bresults\b/i,
  /\bdiscussion\b/i,
  /\bconclusion\b/i,
  /\blimitations\b|\bfuture work\b/i,
  /\barxiv:/i,
  /\bdoi:\s*10\./i,
  /\bacm\b|\bieee\b/i,
  /\bproceedings of\b/i,
  /\bablation\b|\bbenchmark\b|\bdataset\b/i,
];

const ARTICLE_HINTS = [
  /\b(opinion|editorial|blog|newsletter)\b/i,
  /\b(subscribe|newsletter|cookie policy)\b/i,
  /\bposted on\b|\bminutes read\b/i,
];

function countMatches(text: string, patterns: RegExp[]) {
  let n = 0;
  for (const p of patterns) {
    if (p.test(text)) n++;
  }
  return n;
}

/** Rough citation-like density: [12], [3,4], (Author et al., 2020) */
function citationDensityScore(text: string) {
  const sample = text.slice(0, 50_000);
  const bracket = (sample.match(/\[\d{1,3}(?:\s*[,–-]\s*\d{1,3})*\]/g) ?? []).length;
  const parenYear = (sample.match(/\(\s*\d{4}\s*\)/g) ?? []).length;
  const etAl = (sample.match(/\bet al\.?\b/gi) ?? []).length;
  const per1k = (sample.length / 1000) || 1;
  return Math.min(5, (bracket + parenYear * 0.5 + etAl * 0.3) / per1k);
}

export function classifyContentType(
  text: string,
  hints?: { sourceUrl?: string | null; isPdf?: boolean }
): ContentClassification {
  const t = text.slice(0, 120_000);
  const lower = t.toLowerCase();

  let paper = countMatches(t, PAPER_HINTS);
  let article = countMatches(t, ARTICLE_HINTS);

  paper += Math.min(3, citationDensityScore(t) * 2);

  if (hints?.isPdf) paper += 1.5;
  const url = hints?.sourceUrl?.toLowerCase() ?? "";
  if (url.includes("arxiv.org") || url.includes("doi.org") || url.includes("aclanthology")) {
    paper += 2;
  }
  if (url.includes("medium.com") || url.includes("substack.com") || url.includes("blog")) {
    article += 1.5;
  }

  const diff = paper - article;
  let primary: ContentKind = "unknown";
  let confidence: ContentClassification["confidence"] = "low";

  if (diff >= 3) {
    primary = "research_paper";
    confidence = diff >= 6 ? "high" : "medium";
  } else if (diff <= -2) {
    primary = "article";
    confidence = "medium";
  } else if (paper >= 4) {
    primary = "research_paper";
    confidence = "low";
  } else if (article >= 2) {
    primary = "article";
    confidence = "low";
  }

  const rationale =
    primary === "research_paper"
      ? `Heuristic signals favor academic structure (score paper=${paper.toFixed(1)}, article=${article.toFixed(1)}).`
      : primary === "article"
        ? `Heuristic signals favor general article / web content (paper=${paper.toFixed(1)}, article=${article.toFixed(1)}).`
        : `Mixed or weak signals (paper=${paper.toFixed(1)}, article=${article.toFixed(1)}); using balanced prompt with notice.`;

  return {
    primary,
    confidence,
    rationale,
    scores: { paper, article },
  };
}
