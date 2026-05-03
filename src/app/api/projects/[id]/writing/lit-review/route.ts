import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { buildLiteratureReviewDraftPrompt } from "@/prompts/literature-review-draft";
import { buildDefaultProviderRouter } from "@/services/llm/router-factory";
import { paperRepo } from "@/services/repositories/paper-repo";
import { projectRepo } from "@/services/repositories/project-repo";
import { writingRepo } from "@/services/repositories/writing-repo";

function bundlePapers(papers: Awaited<ReturnType<typeof paperRepo.listByProject>>) {
  return papers
    .map(
      (p) =>
        `### ${p.paper_title}\n` +
        `- Authors: ${p.authors || "—"}\n` +
        `- Confidence: ${p.scan_confidence}\n` +
        `- Methods (extracted): ${(p.research_facets.methods ?? []).join(", ") || "—"}\n` +
        `- Datasets: ${(p.research_facets.datasets ?? []).join(", ") || "—"}\n` +
        `- Performance (extracted): ${p.research_facets.performance_level}\n` +
        `- Summary: ${(p.executive_summary ?? "").slice(0, 1200)}\n` +
        `- Results: ${(p.results_summary ?? "").slice(0, 800)}\n`
    )
    .join("\n");
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const project = await projectRepo.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const papers = await paperRepo.listByProject(projectId, 80);
  if (!papers.length) {
    return NextResponse.json(
      { error: "no_papers", userMessage: "Add papers to this project before generating a literature review." },
      { status: 400 }
    );
  }

  const sourceHash = createHash("sha256")
    .update(papers.map((p) => p.id).sort().join(","))
    .digest("hex")
    .slice(0, 32);

  const bundle = bundlePapers(papers);
  const messages = buildLiteratureReviewDraftPrompt({
    projectTitle: project.title,
    thesisDirection: project.thesis_direction,
    objective: project.objective,
    papersBundle: bundle,
  });

  const router = buildDefaultProviderRouter();
  const estimatedTokens = Math.ceil(bundle.length / 3) + 800;

  try {
    const { result } = await router.chat({ messages, estimatedTokens });
    const draft = result.outputText.trim();
    await writingRepo.getOrCreate(projectId);
    const updated = await writingRepo.update(projectId, {
      lit_review_draft: draft,
      lit_review_generated_at: new Date(),
      lit_review_source_hash: sourceHash,
    });
    return NextResponse.json({
      writing: updated,
      generated_at: new Date().toISOString(),
      model: `${result.provider}:${result.model}`,
      source_hash: sourceHash,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LLM error";
    return NextResponse.json({ error: "generation_failed", userMessage: msg }, { status: 502 });
  }
}
