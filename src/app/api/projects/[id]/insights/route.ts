import { NextResponse } from "next/server";

import { projectInsightsRepo } from "@/services/repositories/project-insights-repo";
import { paperRepo } from "@/services/repositories/paper-repo";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;

  const insights = await projectInsightsRepo.listByProject(projectId, 200);
  const papers = await paperRepo.listByProject(projectId, 400);

  // Lightweight aggregation for a strategic view.
  const fitAreaCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  const keywordCounts = new Map<string, number>();

  for (const p of papers) {
    for (const k of p.keywords ?? []) {
      const kk = k.trim().toLowerCase();
      if (!kk) continue;
      keywordCounts.set(kk, (keywordCounts.get(kk) ?? 0) + 1);
    }
  }

  for (const i of insights) {
    const fa = (i.fit_area || "unspecified").trim().toLowerCase();
    fitAreaCounts.set(fa, (fitAreaCounts.get(fa) ?? 0) + 1);
    const pr = (i.priority_level || "optional").trim().toLowerCase();
    priorityCounts.set(pr, (priorityCounts.get(pr) ?? 0) + 1);
    for (const a of i.recommended_actions ?? []) {
      const aa = a.trim();
      if (!aa) continue;
      actionCounts.set(aa, (actionCounts.get(aa) ?? 0) + 1);
    }
  }

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  return NextResponse.json({
    items: insights,
    aggregates: {
      papers_count: papers.length,
      insights_count: insights.length,
      fit_areas: top(fitAreaCounts, 8),
      priorities: top(priorityCounts, 8),
      top_actions: top(actionCounts, 8),
      top_keywords: top(keywordCounts, 12),
    },
  });
}

