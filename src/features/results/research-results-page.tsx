"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardCopy,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FacetsSchema = z.object({
  methods: z.array(z.string()).catch([]),
  datasets: z.array(z.string()).catch([]),
  performance_level: z.string().catch("unclear"),
  core_contribution: z.string().catch(""),
  key_result: z.string().catch(""),
});

const StructuredSchema = z.object({
  idea: z.string().catch(""),
  critique: z.string().catch(""),
  use_in_project: z.string().catch(""),
  open_questions: z.string().catch(""),
  follow_up_tasks: z.string().catch(""),
});

const ItemSchema = z.object({
  item: z.object({
    id: z.string(),
    created_at: z.coerce.date(),
    paper_title: z.string(),
    authors: z.string(),
    source_type: z.enum(["pdf", "url", "text"]),
    source_url: z.string().nullable(),
    executive_summary: z.string(),
    methodology_summary: z.string(),
    results_summary: z.string(),
    discussion_summary: z.string(),
    future_work_summary: z.string(),
    key_takeaways: z.array(z.string()),
    keywords: z.array(z.string()),
    important_concepts: z.array(z.string()),
    user_notes: z.string(),
    reason_for_reading: z.string(),
    user_topic_tag: z.string(),
    processing_model: z.string(),
    processing_status: z.string(),
    scan_confidence: z.enum(["very_low", "low", "medium", "high"]),

    content_type: z.enum(["research_paper", "article", "unknown"]).optional(),
    scan_meta: z.record(z.string(), z.unknown()).optional(),

    project_id: z.string().nullable().optional(),
    research_facets: FacetsSchema.optional(),
    structured_notes: StructuredSchema.optional(),
  }),
});

const PatchSchema = z.object({
  user_notes: z.string().optional(),
  reason_for_reading: z.string().optional(),
  user_topic_tag: z.string().optional(),
  structured_notes: StructuredSchema.partial().optional(),
});

type SectionId =
  | "research_meta"
  | "executive"
  | "takeaways"
  | "methodology"
  | "results"
  | "discussion"
  | "limitations"
  | "concepts"
  | "keywords"
  | "notes"
  | "structured"
  | "why";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "research_meta", label: "Research metadata" },
  { id: "executive", label: "Executive Summary" },
  { id: "takeaways", label: "Key Takeaways" },
  { id: "methodology", label: "Methodology / Approach" },
  { id: "results", label: "Results / Findings" },
  { id: "discussion", label: "Discussion / Interpretation" },
  { id: "limitations", label: "Limitations / Future Work" },
  { id: "concepts", label: "Important Concepts" },
  { id: "keywords", label: "Keywords" },
  { id: "notes", label: "My Notes" },
  { id: "structured", label: "Structured thinking" },
  { id: "why", label: "Why I Read This" },
];

export function ResearchResultsPage({
  id,
  backHref = "/research/scanner",
  backLabel = "Back to scanner",
}: {
  id: string;
  /** Where the top-left back link goes (e.g. archive vs scanner). */
  backHref?: string;
  backLabel?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<z.infer<typeof ItemSchema>["item"] | null>(null);

  const [notes, setNotes] = useState("");
  const [why, setWhy] = useState("");
  const [topic, setTopic] = useState("");
  const [snIdea, setSnIdea] = useState("");
  const [snCritique, setSnCritique] = useState("");
  const [snUse, setSnUse] = useState("");
  const [snOpen, setSnOpen] = useState("");
  const [snTasks, setSnTasks] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/archive/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const parsed = ItemSchema.safeParse(json);
      if (!parsed.success) throw new Error("Unexpected results payload.");
      setData(parsed.data.item);
      setNotes(parsed.data.item.user_notes ?? "");
      setWhy(parsed.data.item.reason_for_reading ?? "");
      setTopic(parsed.data.item.user_topic_tag ?? "");
      const sn = StructuredSchema.parse(parsed.data.item.structured_notes ?? {});
      setSnIdea(sn.idea ?? "");
      setSnCritique(sn.critique ?? "");
      setSnUse(sn.use_in_project ?? "");
      setSnOpen(sn.open_questions ?? "");
      setSnTasks(sn.follow_up_tasks ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  async function loadSuggestions(projectId: string, paperId: string) {
    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/${paperId}/collections/suggest?limit=4`);
      if (!res.ok) return;
      const json = (await res.json()) as { items?: Array<{ id: string; name: string; color: string }> };
      setSuggestions(Array.isArray(json.items) ? json.items : []);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const body = PatchSchema.parse({
        user_notes: notes,
        reason_for_reading: why,
        user_topic_tag: topic,
        structured_notes: {
          idea: snIdea,
          critique: snCritique,
          use_in_project: snUse,
          open_questions: snOpen,
          follow_up_tasks: snTasks,
        },
      });
      const res = await fetch(`/api/archive/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Saved.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data?.project_id) return;
    void loadSuggestions(data.project_id, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project_id, id]);

  const overviewBadges = useMemo(() => {
    if (!data) return [];
    const ct = data.content_type ?? "research_paper";
    const ctLabel =
      ct === "article" ? "Article" : ct === "unknown" ? "Unknown" : "Research paper";
    const facets = data.research_facets;
    const perf = facets?.performance_level ? `Perf: ${facets.performance_level}` : null;
    return [
      { label: `Source: ${data.source_type.toUpperCase()}` },
      { label: `Content: ${ctLabel}` },
      { label: `Confidence: ${data.scan_confidence.replace("_", " ")}` },
      ...(perf ? [{ label: perf }] : []),
      { label: `Model: ${data.processing_model || "local-placeholder"}` },
      { label: `Processed: ${new Date(data.created_at).toLocaleString()}` },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="w-full">
        <Card className="rounded-3xl border-border bg-card/90 p-10 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-lg text-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading results…
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full">
        <Card className="rounded-3xl border-border bg-card/90 p-12 text-center backdrop-blur-sm">
          <div className="text-2xl font-semibold text-foreground">Not found</div>
          <div className="mt-3 text-lg text-muted-foreground">
            This scan may have been deleted or never saved.
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              href="/research/scanner"
              className="rounded-full border border-border bg-muted/50 px-5 py-2.5 text-base text-foreground hover:bg-muted/70"
            >
              Back to scanner
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-5" /> {backLabel}
          </Link>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <Sparkles className="size-4 text-muted-foreground" />
            Scan report
          </div>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-tight">
            {data.paper_title}
          </h1>
          <div className="mt-4 text-xl text-muted-foreground">
            {data.authors || "Authors not detected"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
          >
            <ClipboardCopy className="mr-2 size-4" />
            Copy record
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" /> Save notes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview + layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:gap-14">
        {/* Main reading column */}
        <div className="pr-2">
          {/* Overview strip */}
          <section className="rounded-2xl border border-border/80 bg-gradient-to-b from-muted/50 to-muted/20 px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 text-sm text-foreground">
              {overviewBadges.map((b) => (
                <span
                  key={b.label}
                  className="rounded-full bg-background/50 px-3.5 py-1.5 ring-1 ring-border/50"
                >
                  {b.label}
                </span>
              ))}
            </div>
            {data.source_url ? (
              <div className="mt-3 truncate text-sm text-muted-foreground">
                Source:{" "}
                <a
                  href={data.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {data.source_url}
                </a>
              </div>
            ) : null}
            {data.project_id ? (
              <div className="mt-3 text-sm text-muted-foreground">
                Linked project:{" "}
                <Link
                  href={`/projects/${data.project_id}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Open workspace
                </Link>
              </div>
            ) : null}
          </section>

          {data.project_id ? (
            <section className="mt-8 rounded-2xl border border-border/70 bg-muted/25 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Suggested collections</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Quick-assign based on title/summary/tags. Optional.
                  </div>
                </div>
                {suggestLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Thinking…
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.length ? (
                  suggestions.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        const res = await fetch(`/api/projects/${data.project_id}/papers/${id}/collections`, {
                          method: "PUT",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ collection_ids: [s.id], multi_assign: false }),
                        });
                        if (!res.ok) {
                          const txt = await res.text();
                          try {
                            const j = JSON.parse(txt) as { userMessage?: string; error?: string };
                            toast.error(j.userMessage ?? j.error ?? txt);
                          } catch {
                            toast.error(txt);
                          }
                          return;
                        }
                        toast.success(`Assigned to ${s.name}`);
                      }}
                    >
                      {s.name}
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No suggestions yet. Create collections in the project Papers tab.
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => data.project_id && void loadSuggestions(data.project_id, id)}
                >
                  Refresh
                </Button>
              </div>
            </section>
          ) : null}

          {data.research_facets &&
          (data.research_facets.methods.length > 0 ||
            data.research_facets.datasets.length > 0 ||
            data.research_facets.core_contribution?.trim() ||
            data.research_facets.key_result?.trim()) ? (
            <section
              id="research_meta"
              className="mt-10 scroll-mt-28 rounded-2xl border border-border/70 bg-card/80 px-6 py-5"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Research metadata</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Extracted facets for filtering and quick recall (from scan pipeline).
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {(data.research_facets.methods ?? []).map((m) => (
                  <span key={m} className="rounded-full bg-muted/60 px-3 py-1 text-foreground/90">
                    {m}
                  </span>
                ))}
                {(data.research_facets.datasets ?? []).map((d) => (
                  <span key={d} className="rounded-full border border-border bg-muted/40 px-3 py-1">
                    {d}
                  </span>
                ))}
              </div>
              {data.research_facets.core_contribution?.trim() ? (
                <p className="mt-4 text-base leading-relaxed text-foreground/90">
                  <span className="font-medium text-muted-foreground">Contribution: </span>
                  {data.research_facets.core_contribution}
                </p>
              ) : null}
              {data.research_facets.key_result?.trim() ? (
                <p className="mt-3 text-base leading-relaxed text-foreground/90">
                  <span className="font-medium text-muted-foreground">Key result: </span>
                  {data.research_facets.key_result}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Executive Summary */}
          <section id="executive" className="mt-10 scroll-mt-28">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Executive Summary
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => copyToClipboard(data.executive_summary)}
                aria-label="Copy executive summary"
              >
                <ClipboardCopy className="size-4" />
              </Button>
            </div>
            <div className="mt-5 rounded-2xl border border-border/60 bg-card/90 px-7 py-6 text-xl leading-8 text-foreground shadow-md">
              {data.executive_summary?.trim() ? data.executive_summary : "—"}
            </div>
          </section>

          {/* Research-specific extras from scan pipeline */}
          {(data.content_type === "research_paper" || data.content_type === "unknown") &&
          data.scan_meta &&
          typeof data.scan_meta === "object" &&
          data.scan_meta.research_extras &&
          typeof data.scan_meta.research_extras === "object" ? (
            <ResearchExtrasPanel extras={data.scan_meta.research_extras as Record<string, unknown>} />
          ) : null}

          {/* Article-specific structured fields (when stored on scan) */}
          {data.content_type === "article" &&
          data.scan_meta &&
          typeof data.scan_meta.article === "object" &&
          data.scan_meta.article ? (
            <ArticleDetailPanel article={data.scan_meta.article as Record<string, unknown>} />
          ) : null}

          {/* Key takeaways */}
          <ReportList
            id="takeaways"
            title="Key Takeaways"
            items={data.key_takeaways ?? []}
          />

          {/* Flowing sections */}
          <ReportSection
            id="methodology"
            title="Methodology / Approach"
            value={data.methodology_summary}
          />

          <ReportSection
            id="results"
            title="Results / Findings"
            value={data.results_summary}
          />

          <ReportSection
            id="discussion"
            title="Discussion / Interpretation"
            value={data.discussion_summary}
          />

          <ReportSection
            id="limitations"
            title="Limitations / Future Work"
            value={data.future_work_summary}
          />

          {/* Concepts & keywords inline */}
          <section className="mt-12 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="concepts"
                  className="scroll-mt-28 text-2xl font-semibold tracking-tight text-foreground"
                >
                  Important Concepts
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={() =>
                    copyToClipboard((data.important_concepts ?? []).join(", "))
                  }
                  aria-label="Copy concepts"
                >
                  <ClipboardCopy className="size-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.important_concepts ?? []).length ? (
                  (data.important_concepts ?? []).map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-muted/50 px-3.5 py-1.5 text-sm text-foreground ring-1 ring-border/40"
                    >
                      {c}
                    </span>
                  ))
                ) : (
                  <p className="text-base text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="keywords"
                  className="scroll-mt-28 text-2xl font-semibold tracking-tight text-foreground"
                >
                  Keywords
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={() =>
                    copyToClipboard((data.keywords ?? []).join(", "))
                  }
                  aria-label="Copy keywords"
                >
                  <ClipboardCopy className="size-4" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.keywords ?? []).length ? (
                  (data.keywords ?? []).map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-muted/50 px-3.5 py-1.5 text-sm text-foreground ring-1 ring-border/40"
                    >
                      {k}
                    </span>
                  ))
                ) : (
                  <p className="text-base text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar: section nav + notes */}
        <aside className="space-y-8 lg:pl-2">
          <div className="hidden lg:block">
            <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-border/70 bg-card/90 px-5 py-5 shadow-sm backdrop-blur-sm">
              <div className="text-sm font-semibold tracking-wide text-muted-foreground">
                Jump to section
              </div>
              <div className="mt-4 flex flex-col gap-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-xl px-3 py-2.5 text-base text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(s.id);
                      if (!el) return;
                      window.history.pushState(null, "", `#${s.id}`);
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Notes panel */}
          <section
            id="notes"
            className="scroll-mt-28 rounded-2xl border border-border bg-card/90 px-6 py-6 shadow-sm backdrop-blur-sm"
          >
            <div className="text-lg font-semibold text-foreground">
              My Notes
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              What stood out, questions, links to ideas.
            </p>
            <Separator className="my-4 bg-border/60" />
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Topic / tag</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-2 bg-muted/50 text-base text-foreground"
                  placeholder="e.g. semantic parsing"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">My notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 min-h-44 bg-muted/50 text-base leading-relaxed text-foreground"
                  placeholder="Your reflections, hypotheses, decisions…"
                />
              </div>
            </div>
          </section>

          <section
            id="structured"
            className="scroll-mt-28 rounded-2xl border border-border bg-card/90 px-6 py-6 shadow-sm backdrop-blur-sm"
          >
            <div className="text-lg font-semibold text-foreground">Structured thinking</div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Lightweight sections so notes stay scannable. Freeform notes stay above; use these for synthesis.
            </p>
            <Separator className="my-4 bg-border/60" />
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Idea from this paper</Label>
                <Textarea
                  value={snIdea}
                  onChange={(e) => setSnIdea(e.target.value)}
                  className="mt-2 min-h-20 bg-muted/50 text-base"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Critique</Label>
                <Textarea
                  value={snCritique}
                  onChange={(e) => setSnCritique(e.target.value)}
                  className="mt-2 min-h-20 bg-muted/50 text-base"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Use in my project?</Label>
                <Textarea
                  value={snUse}
                  onChange={(e) => setSnUse(e.target.value)}
                  className="mt-2 min-h-20 bg-muted/50 text-base"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Open questions</Label>
                <Textarea
                  value={snOpen}
                  onChange={(e) => setSnOpen(e.target.value)}
                  className="mt-2 min-h-20 bg-muted/50 text-base"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Follow-up tasks</Label>
                <Textarea
                  value={snTasks}
                  onChange={(e) => setSnTasks(e.target.value)}
                  className="mt-2 min-h-20 bg-muted/50 text-base"
                />
              </div>
            </div>
          </section>

          {/* Why I read this */}
          <section
            id="why"
            className="scroll-mt-28 rounded-2xl border border-border bg-card/90 px-6 py-6 shadow-sm backdrop-blur-sm"
          >
            <div className="text-lg font-semibold text-foreground">
              Why I Read This
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Capture intent so future-you understands the context.
            </p>
            <Separator className="my-4 bg-border/60" />
            <Textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              className="min-h-32 bg-muted/50 text-base leading-relaxed text-foreground"
              placeholder="Motivation, question, or what you were trying to learn."
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function ReportSection({ id, title, value }: { id: string; title: string; value: string }) {
  return (
    <section id={id} className="mt-12 scroll-mt-28">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() => copyToClipboard(value)}
          aria-label={`Copy ${title}`}
        >
          <ClipboardCopy className="size-4" />
        </Button>
      </div>
      <div className="mt-4 text-xl leading-8 text-foreground/90 whitespace-pre-wrap">
        {value?.trim() ? value : "—"}
      </div>
    </section>
  );
}

function ReportList({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section id={id} className="mt-10 scroll-mt-28">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          onClick={() => copyToClipboard((items ?? []).join("\n"))}
          aria-label={`Copy ${title}`}
        >
          <ClipboardCopy className="size-4" />
        </Button>
      </div>
      <ul className="mt-4 space-y-4 text-xl leading-8 text-foreground/90">
        {(items ?? []).length ? (
          items.map((x, idx) => (
            <li key={`${idx}-${x}`} className="flex gap-3">
              <span className="mt-3 size-2 shrink-0 rounded-full bg-foreground/25" />
              <span className="min-w-0">{x}</span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground">—</li>
        )}
      </ul>
    </section>
  );
}

function ResearchExtrasPanel({ extras }: { extras: Record<string, unknown> }) {
  const problem = typeof extras.problem_statement === "string" ? extras.problem_statement : "";
  const why = typeof extras.why_it_matters === "string" ? extras.why_it_matters : "";
  const missing = Array.isArray(extras.missing_or_unclear_sections)
    ? (extras.missing_or_unclear_sections as string[])
    : [];

  if (!problem.trim() && !why.trim() && !missing.length) return null;

  return (
    <section className="mt-10 space-y-6 border-t border-border pt-10">
      {problem.trim() ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Problem</h2>
          <p className="mt-3 text-lg leading-relaxed text-foreground/85 whitespace-pre-wrap">{problem}</p>
        </div>
      ) : null}
      {why.trim() ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Why it matters</h2>
          <p className="mt-3 text-lg leading-relaxed text-foreground/85 whitespace-pre-wrap">{why}</p>
        </div>
      ) : null}
      {missing.length ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Missing or unclear</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-foreground/90">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ArticleDetailPanel({ article }: { article: Record<string, unknown> }) {
  const main =
    typeof article.main_argument === "string" ? article.main_argument : "";
  const evidence = Array.isArray(article.evidence_examples)
    ? (article.evidence_examples as string[])
    : [];
  const nuances =
    typeof article.important_nuances === "string" ? article.important_nuances : "";
  const remember = Array.isArray(article.what_to_remember)
    ? (article.what_to_remember as string[])
    : [];

  if (!main.trim() && !evidence.length && !nuances.trim() && !remember.length) return null;

  return (
    <section className="mt-10 space-y-6 border-t border-border pt-10">
      {main.trim() ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Main argument</h2>
          <p className="mt-3 text-lg leading-relaxed text-foreground/85 whitespace-pre-wrap">{main}</p>
        </div>
      ) : null}
      {evidence.length ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Evidence & examples</h2>
          <ul className="mt-3 space-y-3 text-lg leading-relaxed text-foreground/85">
            {evidence.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/30" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {nuances.trim() ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Nuances</h2>
          <p className="mt-3 text-lg leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {nuances}
          </p>
        </div>
      ) : null}
      {remember.length ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">What to remember</h2>
          <ul className="mt-3 space-y-2 text-lg text-foreground/85">
            {remember.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied.");
  } catch {
    toast.error("Couldn’t copy.");
  }
}

