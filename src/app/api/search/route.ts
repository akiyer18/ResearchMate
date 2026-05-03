import { NextResponse } from "next/server";
import { z } from "zod";

import { sortByFuzzy } from "@/lib/fuzzy-match";
import { notesRepo } from "@/services/repositories/notes-repo";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectRepo } from "@/services/repositories/project-repo";

const QuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query required", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const q = parsed.data.q;
  const lim = Math.min(parsed.data.limit ?? 12, 20);

  const [papers, projects, notes] = await Promise.all([
    paperRepo.listArchive({ q, limit: 40 }),
    projectRepo.list(),
    notesRepo.searchAll(q, 20),
  ]);

  const paperHits = sortByFuzzy(q, papers, (p) => `${p.paper_title} ${p.authors} ${p.user_topic_tag}`).slice(
    0,
    lim
  );
  const projectHits = sortByFuzzy(q, projects, (p) => `${p.title} ${p.objective}`).slice(0, lim);
  const noteHits = sortByFuzzy(q, notes, (n) => `${n.title} ${n.content}`).slice(0, lim);

  return NextResponse.json({
    papers: paperHits.map((p) => ({
      id: p.id,
      title: p.paper_title,
      subtitle: p.authors || p.user_topic_tag || p.source_type,
      href: `/research/archive/${p.id}`,
    })),
    projects: projectHits.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.status,
      href: `/projects/${p.id}`,
    })),
    notes: noteHits.map((n) => ({
      id: n.id,
      title: n.title,
      subtitle: n.content.slice(0, 80) + (n.content.length > 80 ? "…" : ""),
      href: `/projects/${n.project_id}/notes`,
    })),
  });
}
