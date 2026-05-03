import { NextResponse } from "next/server";

import { activityRepo } from "@/services/repositories/activity-repo";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectRepo } from "@/services/repositories/project-repo";

export async function GET() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [papersThisWeek, activeProjects, recentPapers, decay, activity, allProjects] =
    await Promise.all([
      paperRepo.countSince(weekAgo),
      projectRepo.countActive(),
      paperRepo.listArchive({ limit: 6 }),
      paperRepo.listDecayCandidates(6),
      activityRepo.listRecent("local", 10),
      projectRepo.list(),
    ]);

  const topicCounts = new Map<string, number>();
  const archiveSample = await paperRepo.listArchive({ limit: 200 });
  for (const p of archiveSample) {
    const t = p.user_topic_tag?.trim();
    if (t) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
    for (const k of p.keywords ?? []) {
      const kk = k.trim();
      if (kk) topicCounts.set(kk, (topicCounts.get(kk) ?? 0) + 1);
    }
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  const lowConfidence = archiveSample.filter((p) => p.scan_confidence === "very_low" || p.scan_confidence === "low").slice(0, 5);

  return NextResponse.json({
    papers_this_week: papersThisWeek,
    active_projects: activeProjects,
    total_projects: allProjects.length,
    recent_papers: recentPapers.map((p) => ({
      id: p.id,
      title: p.paper_title,
      href: `/research/archive/${p.id}`,
      created_at: p.created_at,
      scan_confidence: p.scan_confidence,
    })),
    decay_papers: decay.map((p) => ({
      id: p.id,
      title: p.paper_title,
      href: `/research/archive/${p.id}`,
      last_opened_at: p.last_opened_at,
    })),
    top_topics: topTopics,
    low_confidence: lowConfidence.map((p) => ({
      id: p.id,
      title: p.paper_title,
      href: `/research/archive/${p.id}`,
      scan_confidence: p.scan_confidence,
    })),
    recent_activity: activity,
    recent_projects: allProjects.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      href: `/projects/${p.id}`,
      updated_at: p.updated_at,
    })),
  });
}
