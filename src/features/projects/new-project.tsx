"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FolderKanban, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const BodySchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().default(""),
  project_type: z.enum(["thesis", "side_project", "survey", "implementation", "other"]).default("thesis"),
  status: z.enum(["active", "paused", "complete", "planning"]).default("active"),
  objective: z.string().optional().default(""),
  thesis_direction: z.string().optional().default(""),
  research_problem: z.string().optional().default(""),
  research_questions: z.array(z.string()).optional().default([]),
  methodology_direction: z.string().optional().default(""),
  implementation_goal: z.string().optional().default(""),
  target_outcome: z.string().optional().default(""),
  deadline: z.string().nullable().optional().default(null),
  primary_topics: z.array(z.string()).optional().default([]),
  preferred_methods: z.array(z.string()).optional().default([]),
  preferred_datasets: z.array(z.string()).optional().default([]),
  preferred_metrics: z.array(z.string()).optional().default([]),
  notes_summary: z.string().optional().default(""),
  accent: z.enum(["indigo", "emerald", "fuchsia", "amber", "cyan"]).default("indigo"),
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function NewProject() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [objective, setObjective] = useState("");
  const [thesisDirection, setThesisDirection] = useState("");
  const [researchProblem, setResearchProblem] = useState("");
  const [researchQuestions, setResearchQuestions] = useState("");
  const [methodologyDirection, setMethodologyDirection] = useState("");
  const [implementationGoal, setImplementationGoal] = useState("");
  const [targetOutcome, setTargetOutcome] = useState("");
  const [topics, setTopics] = useState("");

  const computedSlug = useMemo(() => (slug.trim() ? slugify(slug) : slugify(title)), [slug, title]);

  async function create() {
    setSaving(true);
    try {
      const body = BodySchema.parse({
        title,
        slug: computedSlug || slugify(title || "project"),
        description,
        objective,
        thesis_direction: thesisDirection,
        research_problem: researchProblem,
        research_questions: researchQuestions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
        methodology_direction: methodologyDirection,
        implementation_goal: implementationGoal,
        target_outcome: targetOutcome,
        primary_topics: topics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 16),
        accent: "indigo",
      });

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const id = (json?.item?.id as string | undefined) ?? "";
      if (!id) throw new Error("Missing project id.");
      toast.success("Workspace created.");
      router.push(`/projects/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          <ButtonLink href="/projects" variant="secondary">
            <ArrowLeft className="mr-2 size-4" /> Back
          </ButtonLink>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <FolderKanban className="size-4 text-muted-foreground" />
            New Project Workspace
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Create a command center for your research
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
            The stronger your objective and thesis direction, the better the Insights Engine can evaluate new papers.
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/95 p-8 shadow-sm backdrop-blur-sm lg:p-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Project title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thesis: Efficient Retrieval-Augmented Generation"
                className="mt-2 bg-muted/55"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Slug (optional)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={computedSlug || "auto-generated"}
                className="mt-2 bg-muted/55"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                Workspace URL uses: <span className="text-muted-foreground">{computedSlug || "…"}</span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Short description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                className="mt-2 min-h-28 bg-muted/55"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Primary topics (comma-separated)</Label>
              <Input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="retrieval, evaluation, systems"
                className="mt-2 bg-muted/55"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Insights Engine quality</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Fill these fields to make project-relative insights sharp and actionable.
                  </div>
                </div>
                <Sparkles className="size-4 text-muted-foreground" />
              </div>
              <Separator className="my-4 bg-muted/50" />
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Objective</Label>
                  <Textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="What outcome are you aiming for?"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Thesis direction</Label>
                  <Textarea
                    value={thesisDirection}
                    onChange={(e) => setThesisDirection(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="Your current direction / argument / hypothesis framing."
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Research problem</Label>
                  <Textarea
                    value={researchProblem}
                    onChange={(e) => setResearchProblem(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="The core problem you’re solving."
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Research questions (one per line)</Label>
                  <Textarea
                    value={researchQuestions}
                    onChange={(e) => setResearchQuestions(e.target.value)}
                    className="mt-2 min-h-28 bg-muted/55"
                    placeholder={"RQ1: ...\nRQ2: ..."}
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Methodology direction</Label>
                  <Textarea
                    value={methodologyDirection}
                    onChange={(e) => setMethodologyDirection(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="Methods you expect or prefer."
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Implementation goal</Label>
                  <Textarea
                    value={implementationGoal}
                    onChange={(e) => setImplementationGoal(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="What you plan to build/test."
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Target outcome</Label>
                  <Textarea
                    value={targetOutcome}
                    onChange={(e) => setTargetOutcome(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="Deliverable, metric, or end-state."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <ButtonLink href="/projects" variant="secondary">
                Cancel
              </ButtonLink>
              <Button onClick={create} disabled={saving}>
                <CheckCircle2 className="mr-2 size-4" />
                {saving ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

