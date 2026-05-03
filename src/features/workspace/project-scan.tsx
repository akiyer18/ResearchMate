"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  FileText,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadZone } from "@/components/shared/upload-zone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectSchema = z.object({
  item: z.object({
    id: z.string(),
    title: z.string(),
    objective: z.string(),
    thesis_direction: z.string(),
    primary_topics: z.array(z.string()),
  }),
});

const ProjectScanResponseSchema = z.object({
  project_id: z.string(),
  generated_at: z.string(),
  content_type: z.string().optional(),
  scan_meta: z.record(z.string(), z.unknown()).optional(),
  paper_summary: z.object({
    id: z.string(),
    paper_title: z.string(),
    authors: z.string(),
    source_type: z.enum(["pdf", "url", "text"]),
    created_at: z.coerce.date(),
      executive_summary: z.string(),
      methodology_summary: z.string(),
      results_summary: z.string(),
      discussion_summary: z.string(),
      future_work_summary: z.string(),
    keywords: z.array(z.string()),
    important_concepts: z.array(z.string()),
      processing_model: z.string(),
      processing_status: z.string(),
      scan_confidence: z.string(),
  }),
  project_insights: z.object({
    fit_area: z.string(),
    priority_level: z.string(),
    relevance_explanation: z.string(),
    project_fit_summary: z.string(),
    recommended_actions: z.array(z.string()),
    related_project_papers: z.array(
      z.object({
        paper_summary_id: z.string(),
        title: z.string(),
        relation: z.string(),
        why_related: z.string(),
      })
    ),
    confidence_notes: z.string(),
  }),
});

type Mode = "pdf" | "url" | "text";
type Intent =
  | "quick_understanding"
  | "literature_review"
  | "methodology_study"
  | "implementation_reference"
  | "writing_support"
  | "gap_finding"
  | "evaluation_comparison";
type Depth = "quick" | "standard" | "deep";

type State =
  | { status: "idle" }
  | { status: "ingesting" | "extracting" | "analyzing" | "insights"; progress: number }
  | { status: "done"; result: z.infer<typeof ProjectScanResponseSchema>; paperText: string }
  | { status: "error"; message: string };

export function ProjectScan({ projectId }: { projectId: string }) {
  return (
    <Suspense fallback={null}>
      <ProjectScanInner projectId={projectId} />
    </Suspense>
  );
}

function ProjectScanInner({ projectId }: { projectId: string }) {
  const params = useSearchParams();
  const initialMode = (params.get("mode") as Mode | null) ?? "text";

  const [project, setProject] = useState<z.infer<typeof ProjectSchema>["item"] | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [mode, setMode] = useState<Mode>(
    initialMode === "pdf" || initialMode === "url" || initialMode === "text" ? initialMode : "text"
  );
  const [intent, setIntent] = useState<Intent>("literature_review");
  const [depth, setDepth] = useState<Depth>("standard");

  const [paperText, setPaperText] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [collections, setCollections] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [collectionId, setCollectionId] = useState<string>(""); // empty = unassigned

  const [state, setState] = useState<State>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadingProject(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        const parsed = ProjectSchema.safeParse(json);
        if (!parsed.success) throw new Error("Unexpected project response.");
        setProject(parsed.data.item);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    }
    void load();
  }, [projectId]);

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await fetch(`/api/projects/${projectId}/collections`);
        if (!res.ok) return;
        const json = (await res.json()) as { items?: Array<{ id: string; name: string; color: string }> };
        setCollections(Array.isArray(json.items) ? json.items : []);
      } catch {
        /* ignore */
      }
    }
    void loadCollections();
  }, [projectId]);

  const progress =
    state.status === "ingesting" ||
    state.status === "extracting" ||
    state.status === "analyzing" ||
    state.status === "insights"
      ? state.progress
      : state.status === "done"
        ? 100
        : 0;

  async function run() {
    setSaved(false);
    if (mode === "url") {
      const u = paperUrl.trim();
      if (!u) {
        toast.error("Enter a paper URL.");
        return;
      }
      if (!isValidHttpUrl(u)) {
        toast.error("That doesn’t look like a valid http(s) URL.");
        return;
      }
    } else if (!paperText.trim()) {
      toast.error("Add some paper text first.");
      return;
    }

    try {
      setState({ status: "ingesting", progress: 18 });
      await sleep(180);
      setState({ status: "extracting", progress: 35 });
      await sleep(180);
      setState({ status: "analyzing", progress: 64 });

      const res = await fetch(`/api/projects/${projectId}/scan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_type: mode,
          source_url: mode === "url" && paperUrl.trim() ? paperUrl.trim() : null,
          paper_text: paperText,
          reading_intent: intent,
          output_depth: depth,
          collection_id: collectionId ? collectionId : null,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let msg = errText;
        try {
          const j = JSON.parse(errText) as { userMessage?: string; error?: string };
          if (j.userMessage) msg = j.userMessage;
          else if (j.error) msg = j.error;
        } catch {
          /* keep raw */
        }
        throw new Error(msg);
      }
      const json = await res.json();
      const parsed = ProjectScanResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("Unexpected analyze response.");

      setState({ status: "insights", progress: 86 });
      await sleep(250);

      setState({
        status: "done",
        result: parsed.data,
        paperText: mode === "url" ? `${paperUrl.trim()}\n\n${paperText}`.trim() : paperText,
      });
      toast.success("Project scan complete.");
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Unknown error" });
      toast.error("Scan failed.");
    }
  }

  async function savePaper() {
    if (state.status !== "done") return;
    if (saved) {
      toast.success("Already saved to this project.");
      return;
    }
    setSaving(true);
    try {
      const summaryId = state.result.paper_summary.id;
      const res = await fetch(`/api/projects/${projectId}/papers/log`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paper_summary_id: summaryId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSaved(true);
      toast.success(json.already_logged ? "Already saved." : "Saved to this project.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Log failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" /> Back to workspace
          </Link>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <Sparkles className="size-4 text-muted-foreground" />
            Project-aware scanning
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Scan a paper into this project
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
            You’ll get two outputs: a structured paper summary and a project-relative insights panel.
          </p>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/95 p-8 shadow-sm backdrop-blur-sm lg:p-10">
        <div className="rounded-3xl border border-border/70 bg-muted/40 p-6">
          <div className="text-sm font-semibold tracking-wide text-muted-foreground">Project context</div>
          <div className="mt-3 text-xl font-semibold text-foreground">
            {loadingProject ? "Loading…" : project?.title ?? "—"}
          </div>
          <div className="mt-2 text-base leading-relaxed text-muted-foreground">{project?.objective || "—"}</div>
          <div className="mt-4 text-base text-muted-foreground">
            <span className="font-medium text-foreground/90">Thesis direction:</span>{" "}
            {project?.thesis_direction || "—"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(project?.primary_topics ?? []).slice(0, 6).map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <Separator className="my-5 bg-muted/50" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="size-4" /> PDF
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  URL
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  Text
                </TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-4">
                <Label className="text-muted-foreground">Paper URL</Label>
                <Input
                  value={paperUrl}
                  onChange={(e) => setPaperUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/..."
                  className="mt-2 bg-muted/55"
                />
                <div className="mt-4">
                  <Label className="text-muted-foreground">Optional excerpt</Label>
                  <Textarea
                    value={paperText}
                    onChange={(e) => setPaperText(e.target.value)}
                    className="mt-2 min-h-40 bg-muted/55"
                    placeholder="Paste abstract/method/results if needed."
                  />
                </div>
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <Label className="text-muted-foreground">Paper text</Label>
                <Textarea
                  value={paperText}
                  onChange={(e) => setPaperText(e.target.value)}
                  className="mt-2 min-h-56 bg-muted/55"
                  placeholder="Paste the paper text or key sections."
                />
              </TabsContent>
              <TabsContent value="pdf" className="mt-4">
                <UploadZone
                  onTextReady={({ text }) => {
                    setPaperText(text);
                    toast.success("PDF text extracted. Ready to scan.");
                  }}
                />
                <div className="mt-4">
                  <Label className="text-muted-foreground">Paper text</Label>
                  <Textarea
                    value={paperText}
                    onChange={(e) => setPaperText(e.target.value)}
                    className="mt-2 min-h-44 bg-muted/55"
                    placeholder="Paste extracted text here."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <div className="text-sm font-medium text-foreground">Intent & depth</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Helps the Insights Engine judge what matters for you right now.
              </div>
              <Separator className="my-4 bg-muted/50" />
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Reading intent</Label>
                  <select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value as Intent)}
                    className="mt-2 w-full rounded-2xl border border-border bg-muted/55 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="quick_understanding">quick understanding</option>
                    <option value="literature_review">literature review</option>
                    <option value="methodology_study">methodology study</option>
                    <option value="implementation_reference">implementation reference</option>
                    <option value="writing_support">writing support</option>
                    <option value="gap_finding">gap finding</option>
                    <option value="evaluation_comparison">evaluation comparison</option>
                  </select>
                </div>
                <div>
                  <Label className="text-muted-foreground">Depth</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["quick", "standard", "deep"] as const).map((d) => (
                      <Button
                        key={d}
                        variant={depth === d ? "default" : "secondary"}
                        onClick={() => setDepth(d)}
                        className="w-full justify-center"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Collection (optional)</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Assign this scan to a project collection (or leave unassigned).
                  </div>
                </div>
                <Link
                  href={`/projects/${projectId}/papers`}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Manage
                </Link>
              </div>
              <Separator className="my-4 bg-muted/50" />
              <Label className="text-muted-foreground">Add to collection</Label>
              <Select
                value={collectionId || "unassigned"}
                onValueChange={(v) => {
                  const vv = v ?? "unassigned";
                  setCollectionId(vv === "unassigned" ? "" : vv);
                }}
              >
                <SelectTrigger className="mt-2 w-full bg-muted/55">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(collections ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!collections.length ? (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  No collections yet. Create one in the project Papers tab.
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-border bg-card/85 p-4">
              <div className="text-xs font-medium tracking-wide text-muted-foreground">Progress</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  {state.status === "idle" ? "Ready" : state.status}
                </div>
                <div className="text-xs text-muted-foreground">{progress}%</div>
              </div>
              <Progress value={progress} className="mt-3" />
              <div className="mt-3 flex gap-2">
                <Button onClick={run} className="w-full" disabled={state.status !== "idle" && state.status !== "done" && state.status !== "error"}>
                  {state.status === "ingesting" ||
                  state.status === "extracting" ||
                  state.status === "analyzing" ||
                  state.status === "insights" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Run project scan
                    </>
                  )}
                </Button>
              </div>
              {state.status === "error" ? (
                <div className="mt-3 text-xs text-rose-200/90">{state.message}</div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {state.status === "done" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Paper Summary</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Structured scan output (summary prompt).
                </div>
              </div>
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <Separator className="my-4 bg-muted/50" />
            <div className="text-lg font-semibold text-foreground">{state.result.paper_summary.paper_title}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {state.result.paper_summary.authors || "Authors not detected"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {state.result.content_type ? (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100/90">
                  {state.result.content_type.replace(/_/g, " ")}
                </span>
              ) : null}
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                Model: {state.result.paper_summary.processing_model || "—"}
              </span>
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
                Confidence: {state.result.paper_summary.scan_confidence || "—"}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <Block title="Abstract / overview" value={state.result.paper_summary.executive_summary || "—"} />
              <Block title="Methodology" value={state.result.paper_summary.methodology_summary || "—"} />
              <Block title="Results" value={state.result.paper_summary.results_summary || "—"} />
              <Block
                title="Keywords / concepts"
                value={[
                  ...(state.result.paper_summary.keywords ?? []).slice(0, 10),
                  ...(state.result.paper_summary.important_concepts ?? []).slice(0, 6),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </div>
          </Card>

          <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Project Insights</div>
                <div className="mt-1 text-xs text-muted-foreground">Project-relative insights (stored)</div>
              </div>
              <Lightbulb className="size-5 text-muted-foreground" />
            </div>
            <Separator className="my-4 bg-muted/50" />
            <div className="space-y-3">
              <Block title="Why this matters" value={state.result.project_insights.relevance_explanation} />
              <Block title="Where it fits" value={state.result.project_insights.project_fit_summary} />
              <Block title="LLM confidence notes" value={state.result.project_insights.confidence_notes} />
              <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">
                    Fit area: {state.result.project_insights.fit_area || "—"}
                  </span>
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">
                    Priority: {state.result.project_insights.priority_level || "—"}
                  </span>
                </div>
                <div className="mt-3 text-xs font-medium tracking-wide text-muted-foreground">
                  Recommended next actions
                </div>
                <ul className="mt-2 space-y-2">
                  {(state.result.project_insights.recommended_actions ?? []).slice(0, 6).map((a) => (
                    <li key={a} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/25" />
                      <span className="min-w-0">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  onClick={() => copyToClipboard(JSON.stringify(state.result.project_insights, null, 2))}
                  variant="secondary"
                >
                  <ClipboardCopy className="mr-2 size-4" />
                  Copy insights JSON
                </Button>
                <Button onClick={savePaper} disabled={saving || saved}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> …
                    </>
                  ) : (
                    <>
                      {saved ? (
                        <>
                          <Check className="mr-2 size-4" /> Saved
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 size-4" /> Save paper
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied.");
  } catch {
    toast.error("Couldn’t copy.");
  }
}

