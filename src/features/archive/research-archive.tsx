"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  LayoutGrid,
  ListFilter,
  Search,
  Table2,
} from "lucide-react";
import { z } from "zod";

import { PaperHoverPreview, type PaperPreviewData } from "@/components/papers/paper-hover-preview";
import {
  PaperFiltersBar,
  appendSmartParams,
} from "@/components/papers/paper-filters-bar";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArchiveQuery } from "@/services/repositories/paper-repo";
import type { PaperSummaryRecord } from "@/types/papers";
import type { PerformanceLevel } from "@/types/research-facets";
import { toast } from "sonner";

const FacetsSummarySchema = z.object({
  methods: z.array(z.string()).catch([]),
  datasets: z.array(z.string()).catch([]),
  performance_level: z.string().catch("unclear"),
  core_contribution: z.string().catch(""),
  key_result: z.string().catch(""),
});

const SummarySchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  paper_title: z.string(),
  authors: z.string(),
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().nullable(),
  executive_summary: z.string(),
  methodology_summary: z.string().optional(),
  results_summary: z.string().optional(),
  keywords: z.array(z.string()),
  user_topic_tag: z.string(),
  user_notes: z.string(),
  scan_confidence: z.enum(["very_low", "low", "medium", "high"]),
  research_facets: FacetsSummarySchema.optional(),
  project_id: z.string().nullable().optional(),
});

const ListResponseSchema = z.object({
  items: z.array(SummarySchema),
});

type ViewMode = "table" | "cards";

export function ResearchArchive() {
  const [view, setView] = useState<ViewMode>("table");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sourceType, setSourceType] = useState<"all" | "pdf" | "url" | "text">("all");
  const [methodsCsv, setMethodsCsv] = useState("");
  const [datasetsCsv, setDatasetsCsv] = useState("");
  const [performanceLevels, setPerformanceLevels] = useState<PerformanceLevel[]>([]);
  const [confidenceLevels, setConfidenceLevels] = useState<PaperSummaryRecord["scan_confidence"][]>([]);
  const [sort, setSort] = useState<NonNullable<ArchiveQuery["sort"]>>("created_desc");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<z.infer<typeof SummarySchema>[]>([]);

  function togglePerformance(p: PerformanceLevel) {
    setPerformanceLevels((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function toggleConfidence(c: PaperSummaryRecord["scan_confidence"]) {
    setConfidenceLevels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (topic.trim()) sp.set("topic", topic.trim());
      if (keyword.trim()) sp.set("keyword", keyword.trim());
      if (sourceType !== "all") sp.set("sourceType", sourceType);
      appendSmartParams(sp, {
        methodsCsv,
        datasetsCsv,
        performanceLevels,
        confidenceLevels,
        sort,
      });
      sp.set("limit", "100");

      const res = await fetch(`/api/archive?${sp.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const parsed = ListResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("Unexpected archive response.");
      setItems(parsed.data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const topics = new Map<string, number>();
    const keywords = new Map<string, number>();
    for (const it of items) {
      if (it.user_topic_tag?.trim()) {
        topics.set(it.user_topic_tag.trim(), (topics.get(it.user_topic_tag.trim()) ?? 0) + 1);
      }
      for (const k of it.keywords ?? []) {
        const kk = k.trim();
        if (!kk) continue;
        keywords.set(kk, (keywords.get(kk) ?? 0) + 1);
      }
    }
    const topTopics = [...topics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topKeywords = [...keywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { total, topTopics, topKeywords };
  }, [items]);

  function toPreview(it: z.infer<typeof SummarySchema>): PaperPreviewData {
    const rf = it.research_facets ?? {
      methods: [],
      datasets: [],
      performance_level: "unclear",
      core_contribution: "",
      key_result: "",
    };
    return {
      paper_title: it.paper_title,
      authors: it.authors,
      executive_summary: it.executive_summary,
      research_facets: rf,
      user_topic_tag: it.user_topic_tag,
      project_id: it.project_id ?? null,
    };
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <BookOpen className="size-4 text-muted-foreground" />
            Research Archive
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Your knowledge vault
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
            Browse scans, search your notes, and revisit the ideas worth keeping.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/research/scanner" variant="secondary">
            Scan another
            <ArrowUpRight className="ml-2 size-4 opacity-70" />
          </ButtonLink>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(280px,400px)] lg:gap-8">
          <div className="rounded-3xl border border-border/70 bg-muted/40 p-6">
            <div className="text-sm font-semibold tracking-wide text-muted-foreground">
              Stats
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">
              {stats.total} papers logged
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card/90 p-4">
                <div className="text-sm font-medium text-muted-foreground">Top topics</div>
                <div className="mt-3 space-y-2 text-base text-muted-foreground">
                  {stats.topTopics.length ? (
                    stats.topTopics.map(([t, n]) => (
                      <div key={t} className="flex items-center justify-between gap-3">
                        <span className="truncate">{t}</span>
                        <span className="text-sm text-muted-foreground">{n}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground">No topics yet.</div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card/90 p-4">
                <div className="text-sm font-medium text-muted-foreground">Keyword pulse</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stats.topKeywords.length ? (
                    stats.topKeywords.map(([k, n]) => (
                      <span
                        key={k}
                        className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
                        title={`${n} occurrences`}
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No keywords yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-foreground">Filters</div>
              <ListFilter className="size-4 text-muted-foreground" />
            </div>
            <Separator className="my-4 bg-muted/50" />

            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Search</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-2.5 size-4 text-foreground/45" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Title, notes, authors…"
                    className="bg-muted/55 pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Topic</Label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. systems"
                    className="mt-2 bg-muted/55"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Keyword</Label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="e.g. benchmark"
                    className="mt-2 bg-muted/55"
                  />
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Source</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["all", "pdf", "url", "text"] as const).map((t) => (
                    <Button
                      key={t}
                      variant={sourceType === t ? "default" : "secondary"}
                      onClick={() => setSourceType(t)}
                      className="w-full justify-center"
                    >
                      {t.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={load} className="w-full" disabled={loading}>
                  {loading ? "Loading…" : "Apply"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setTopic("");
                    setKeyword("");
                    setSourceType("all");
                    setMethodsCsv("");
                    setDatasetsCsv("");
                    setPerformanceLevels([]);
                    setConfidenceLevels([]);
                    setSort("created_desc");
                    void load();
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>

            <PaperFiltersBar
              showSourceType
              methodsCsv={methodsCsv}
              onMethodsCsv={setMethodsCsv}
              datasetsCsv={datasetsCsv}
              onDatasetsCsv={setDatasetsCsv}
              performanceLevels={performanceLevels}
              onTogglePerformance={togglePerformance}
              confidenceLevels={confidenceLevels}
              onToggleConfidence={toggleConfidence}
              sort={sort}
              onSort={setSort}
              onClearSmart={() => {
                setMethodsCsv("");
                setDatasetsCsv("");
                setPerformanceLevels([]);
                setConfidenceLevels([]);
              }}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="table" className="gap-2">
              <Table2 className="size-4" /> Table
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <LayoutGrid className="size-4" /> Cards
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-base text-muted-foreground">{items.length} results</div>
      </div>

      {items.length === 0 && !loading ? (
        <Card className="rounded-3xl border-border bg-card/85 p-10 text-center backdrop-blur">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-muted/50">
            <BookOpen className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 text-base font-medium text-foreground">
            Your archive is empty
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Run a scan, add your notes, and log your first paper.
          </div>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/research/scanner">Scan your first paper</ButtonLink>
          </div>
        </Card>
      ) : null}

      {view === "table" ? (
        <ArchiveTable items={items} toPreview={toPreview} />
      ) : (
        <ArchiveCards items={items} toPreview={toPreview} />
      )}
    </div>
  );
}

function confidencePill(c: z.infer<typeof SummarySchema>["scan_confidence"]) {
  if (c === "high") return "bg-emerald-500/15 text-emerald-100 border-emerald-400/20";
  if (c === "medium") return "bg-indigo-500/15 text-indigo-100 border-indigo-400/20";
  if (c === "low") return "bg-amber-500/15 text-amber-100 border-amber-400/20";
  return "bg-rose-500/15 text-rose-100 border-rose-400/20";
}

function ArchiveTable({
  items,
  toPreview,
}: {
  items: z.infer<typeof SummarySchema>[];
  toPreview: (it: z.infer<typeof SummarySchema>) => PaperPreviewData;
}) {
  return (
    <Card className="rounded-3xl border-border/80 bg-card/95 p-0 shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-base">
          <thead className="border-b border-border text-sm font-semibold text-muted-foreground">
            <tr>
              <th className="px-6 py-5 font-medium">Title</th>
              <th className="px-6 py-5 font-medium">Topic</th>
              <th className="px-6 py-5 font-medium">Keywords</th>
              <th className="px-6 py-5 font-medium">Source</th>
              <th className="px-6 py-5 font-medium">Confidence</th>
              <th className="px-6 py-5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr
                key={it.id}
                className="border-b border-border/40 hover:bg-muted/30"
              >
                <td className="px-6 py-5">
                  <PaperHoverPreview paper={toPreview(it)}>
                    <Link
                      href={`/research/archive/${it.id}`}
                      className="block max-w-[min(100vw,720px)] truncate text-lg font-semibold text-foreground hover:underline"
                    >
                      {it.paper_title}
                    </Link>
                  </PaperHoverPreview>
                  <div className="mt-2 max-w-[min(100vw,820px)] truncate text-sm leading-relaxed text-muted-foreground">
                    {it.executive_summary || it.user_notes || "—"}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                    {it.user_topic_tag?.trim() ? it.user_topic_tag : "—"}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex max-w-[min(100vw,360px)] flex-wrap gap-2">
                    {(it.keywords ?? []).slice(0, 3).map((k) => (
                      <span
                        key={k}
                        className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
                      >
                        {k}
                      </span>
                    ))}
                    {(it.keywords ?? []).length > 3 ? (
                      <span className="text-sm text-muted-foreground">
                        +{(it.keywords ?? []).length - 3}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-5 text-muted-foreground">{it.source_type.toUpperCase()}</td>
                <td className="px-6 py-5">
                  <span
                    className={`rounded-full border px-3 py-1 text-sm ${confidencePill(
                      it.scan_confidence
                    )}`}
                  >
                    {it.scan_confidence.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-5 text-sm text-muted-foreground">
                  {new Date(it.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ArchiveCards({
  items,
  toPreview,
}: {
  items: z.infer<typeof SummarySchema>[];
  toPreview: (it: z.infer<typeof SummarySchema>) => PaperPreviewData;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
      {items.map((it) => (
        <Link key={it.id} href={`/research/archive/${it.id}`} className="block">
          <PaperHoverPreview paper={toPreview(it)}>
            <Card className="group h-full rounded-3xl border-border/80 bg-card/95 p-7 shadow-md ring-1 ring-border/40 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {it.paper_title}
                </div>
                <div className="mt-2 truncate text-sm text-muted-foreground">
                  {it.authors || "Authors not detected"}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-sm ${confidencePill(
                  it.scan_confidence
                )}`}
              >
                {it.scan_confidence.replace("_", " ")}
              </span>
            </div>

            <div className="mt-4 line-clamp-4 text-base leading-7 text-muted-foreground">
              {it.executive_summary || "—"}
            </div>

            <Separator className="my-5 bg-border/50" />

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                {it.source_type.toUpperCase()}
              </span>
              {it.user_topic_tag?.trim() ? (
                <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                  {it.user_topic_tag}
                </span>
              ) : null}
              {(it.keywords ?? []).slice(0, 3).map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
                >
                  {k}
                </span>
              ))}
            </div>
          </Card>
          </PaperHoverPreview>
        </Link>
      ))}
    </div>
  );
}

