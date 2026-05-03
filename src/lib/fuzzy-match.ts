/** Lightweight fuzzy score for command palette / search (no extra deps). */
export function fuzzyScore(query: string, candidate: string): number {
  const q = query.trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!q) return 1;
  if (!c) return 0;
  if (c === q) return 100;
  if (c.includes(q)) return 80 + Math.min(20, Math.floor((q.length / c.length) * 20));

  let qi = 0;
  let score = 0;
  for (let i = 0; i < c.length && qi < q.length; i++) {
    if (c[i] === q[qi]) {
      qi++;
      score += 2;
    }
  }
  if (qi < q.length) return 0;
  return Math.min(70, score);
}

export function sortByFuzzy<T>(query: string, items: T[], getText: (t: T) => string): T[] {
  if (!query.trim()) return items;
  return [...items]
    .map((item) => ({ item, s: fuzzyScore(query, getText(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}
