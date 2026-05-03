export type CitationStyleId = "apa-lite" | "mla-lite" | "chi";

export type CitationPaper = {
  paper_title: string;
  authors: string;
  /** Best-effort year from metadata or title */
  year?: string | null;
};

function firstAuthorLastName(authors: string) {
  const a = authors?.trim();
  if (!a) return "Unknown";
  const first = a.split(/,| and | & /i)[0]?.trim() || a;
  const parts = first.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : first;
}

function guessYearFromText(text: string): string | null {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

export function resolvePaperYear(p: CitationPaper): string {
  if (p.year?.trim()) return p.year.trim();
  const fromTitle = guessYearFromText(p.paper_title);
  return fromTitle ?? "n.d.";
}

export function formatPaperCitation(style: CitationStyleId, p: CitationPaper): string {
  const author = firstAuthorLastName(p.authors);
  const year = resolvePaperYear(p);
  const title = p.paper_title.trim() || "Untitled";

  if (style === "mla-lite") {
    return `${author}. "${title}."`;
  }
  if (style === "chi") {
    return `${author}, "${title}," ${year}.`;
  }
  return `${author} (${year}). ${title}.`;
}
