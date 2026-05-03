"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ClipboardCopy,
  FileSearch,
  FileText,
  GripVertical,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  NotebookPen,
  PenLine,
  Settings2,
  Trash2,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { PaperHoverPreview, type PaperPreviewData } from "@/components/papers/paper-hover-preview";
import {
  PaperFiltersBar,
  appendSmartParams,
} from "@/components/papers/paper-filters-bar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ArchiveQuery } from "@/services/repositories/paper-repo";
import type { PaperSummaryRecord } from "@/types/papers";
import type { PerformanceLevel } from "@/types/research-facets";
import { EditWorkspaceDialog } from "@/features/workspace/edit-workspace-dialog";
import { ProjectNotesTab } from "@/features/workspace/project-notes-tab";
import { ProjectWritingTab } from "@/features/workspace/project-writing-tab";

const ProjectSchema = z.object({
  item: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: z.string(),
    project_type: z.string(),
    objective: z.string(),
    thesis_direction: z.string(),
    research_problem: z.string(),
    research_questions: z.array(z.string()),
    methodology_direction: z.string(),
    implementation_goal: z.string(),
    target_outcome: z.string(),
    primary_topics: z.array(z.string()),
    accent: z.enum(["indigo", "emerald", "fuchsia", "amber", "cyan"]),
  }),
});

export type WorkspaceTab =
  | "overview"
  | "papers"
  | "insights"
  | "notes"
  | "writing"
  | "implementation";

export function ProjectWorkspace({
  projectId,
  activeTab,
}: {
  projectId: string;
  activeTab: WorkspaceTab;
}) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<z.infer<typeof ProjectSchema>["item"] | null>(null);

  async function load() {
    setLoading(true);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const tabs = useMemo(
    () =>
      [
        { key: "overview", label: "Overview", icon: FileSearch, href: `/projects/${projectId}` },
        { key: "papers", label: "Papers", icon: FileText, href: `/projects/${projectId}/papers` },
        { key: "insights", label: "Insights", icon: Lightbulb, href: `/projects/${projectId}/insights` },
        { key: "notes", label: "Notes", icon: NotebookPen, href: `/projects/${projectId}/notes` },
        { key: "writing", label: "Writing", icon: PenLine, href: `/projects/${projectId}/writing` },
        { key: "implementation", label: "Implementation", icon: Settings2, href: `/projects/${projectId}` },
      ] as const,
    [projectId]
  );

  if (loading) {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-8 backdrop-blur">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading workspace…
        </div>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-10 text-center backdrop-blur">
        <div className="text-base font-medium text-foreground">Workspace not found</div>
        <div className="mt-2 text-sm text-muted-foreground">
          The project may have been deleted or never created.
        </div>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/projects" variant="secondary">
            Back to projects
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <Card className="relative overflow-hidden rounded-3xl border-border/80 bg-card/95 p-8 shadow-lg ring-1 ring-border/50 backdrop-blur-sm sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_8%_0%,oklch(0.55_0.04_155_/_0.1),transparent_58%),radial-gradient(700px_circle_at_92%_8%,oklch(0.5_0.035_195_/_0.08),transparent_55%)]" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
                <BookOpen className="size-4 text-muted-foreground" />
                Project Workspace · {project.status}
              </div>
              <div className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {project.title}
              </div>
              <div className="mt-4 max-w-4xl text-lg leading-8 text-muted-foreground">
                {project.description || project.objective || "—"}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(project.primary_topics ?? []).slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/projects/${projectId}/scan`} variant="secondary">
                Scan into project
              </ButtonLink>
              <EditWorkspaceDialog projectId={projectId} project={project} onSaved={load} />
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(project.thesis_direction || "")}
              >
                <ClipboardCopy className="mr-2 size-4" />
                Copy thesis direction
              </Button>
            </div>
          </div>

          <Separator className="my-6 bg-muted/50" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MiniPanel title="Objective" value={project.objective} />
            <MiniPanel title="Thesis direction" value={project.thesis_direction} />
            <MiniPanel title="Implementation goal" value={project.implementation_goal} />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const selected = t.key === activeTab;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-base transition ${
                selected
                  ? "border-border bg-muted/70 text-foreground shadow-sm"
                  : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/55 hover:text-foreground"
              }`}
            >
              <Icon className="size-5 opacity-80" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <WorkspaceBody tab={activeTab} projectId={projectId} project={project} />
    </div>
  );
}

function WorkspaceBody({
  tab,
  projectId,
  project,
}: {
  tab: WorkspaceTab;
  projectId: string;
  project: z.infer<typeof ProjectSchema>["item"];
}) {
  if (tab === "overview") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
          <div className="text-sm font-medium text-foreground">Research questions</div>
          <Separator className="my-4 bg-muted/50" />
          <ul className="space-y-2 text-sm text-muted-foreground">
            {(project.research_questions ?? []).length ? (
              project.research_questions.map((q) => (
                <li key={q} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/25" />
                  <span className="min-w-0">{q}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">Add research questions to sharpen insights.</li>
            )}
          </ul>
        </Card>
        <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
          <div className="text-sm font-medium text-foreground">Next actions</div>
          <Separator className="my-4 bg-muted/50" />
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-muted/50 p-4">
              Scan a key paper into this project to begin building project-aware insights.
            </div>
            <ButtonLink href={`/projects/${projectId}/scan`}>Open project scanner</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  if (tab === "papers") {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground">Project papers</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Papers scanned inside this workspace.
            </div>
          </div>
          <ButtonLink href={`/projects/${projectId}/scan`} variant="secondary">
            Scan into project
          </ButtonLink>
        </div>
        <Separator className="my-4 bg-muted/50" />
        <ProjectPapersList projectId={projectId} />
      </Card>
    );
  }

  if (tab === "insights") {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
        <div className="text-sm font-medium text-foreground">Aggregated insights</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Strategic view across project papers (fit areas, priorities, actions).
        </div>
        <Separator className="my-4 bg-muted/50" />
        <ProjectInsightsOverview projectId={projectId} />
      </Card>
    );
  }

  if (tab === "notes") {
    return <ProjectNotesTab projectId={projectId} />;
  }

  if (tab === "writing") {
    return <ProjectWritingTab projectId={projectId} />;
  }

  return (
    <Card className="rounded-3xl border-border bg-card/85 p-8 text-muted-foreground backdrop-blur">
      <div className="text-sm font-medium text-foreground">Implementation</div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Link experiments and build artifacts here in a future iteration. Use Writing for prose and citations today.
      </div>
    </Card>
  );
}

function MiniPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-muted/40 p-6 shadow-sm">
      <div className="text-sm font-semibold tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-3 whitespace-pre-wrap text-base leading-7 text-foreground/90">
        {value?.trim() ? value : "—"}
      </div>
    </div>
  );
}

type ProjectPaperRow = {
  id: string;
  paper_title: string;
  created_at: string;
  source_type: string;
  keywords: string[];
  authors: string;
  executive_summary: string;
  user_topic_tag: string;
  project_id: string | null;
  research_facets: PaperPreviewData["research_facets"];
  collection_ids?: string[];
};

type CollectionRow = {
  id: string;
  name: string;
  color: "none" | "indigo" | "emerald" | "fuchsia" | "amber" | "cyan";
  order_index: number;
  paper_count: number;
};

function parseApiErrorText(txt: string) {
  try {
    const j = JSON.parse(txt) as { userMessage?: string; error?: string; message?: string };
    return j.userMessage ?? j.error ?? j.message ?? txt;
  } catch {
    return txt;
  }
}

function collectionBadgeClass(color: CollectionRow["color"]) {
  if (color === "emerald") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-50";
  if (color === "indigo") return "border-indigo-400/25 bg-indigo-500/10 text-indigo-50";
  if (color === "fuchsia") return "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-50";
  if (color === "amber") return "border-amber-400/25 bg-amber-500/10 text-amber-50";
  if (color === "cyan") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-50";
  return "border-border bg-muted/40 text-muted-foreground";
}

function ProjectPapersList({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProjectPaperRow[]>([]);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [activeCollectionId, setActiveCollectionId] = useState<string>("all"); // all|unassigned|<id>
  const [multiAssign, setMultiAssign] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState<CollectionRow["color"]>("none");
  const [creating, setCreating] = useState(false);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected]
  );
  const [methodsCsv, setMethodsCsv] = useState("");
  const [datasetsCsv, setDatasetsCsv] = useState("");
  const [performanceLevels, setPerformanceLevels] = useState<PerformanceLevel[]>([]);
  const [confidenceLevels, setConfidenceLevels] = useState<PaperSummaryRecord["scan_confidence"][]>([]);
  const [sort, setSort] = useState<NonNullable<ArchiveQuery["sort"]>>("created_desc");

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
      appendSmartParams(sp, {
        methodsCsv,
        datasetsCsv,
        performanceLevels,
        confidenceLevels,
        sort,
      });
      sp.set("limit", "80");
      const res = await fetch(`/api/projects/${projectId}/papers?${sp.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { items?: Record<string, unknown>[] };
      setItems(
        (json.items ?? []).map((p) => {
          const rfRaw = p.research_facets as PaperPreviewData["research_facets"] | undefined;
          const rf = rfRaw ?? {
            methods: [],
            datasets: [],
            performance_level: "unclear",
            core_contribution: "",
            key_result: "",
          };
          return {
            id: String(p.id),
            paper_title: String(p.paper_title ?? ""),
            created_at: String(p.created_at ?? ""),
            source_type: String(p.source_type ?? ""),
            keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
            authors: String(p.authors ?? ""),
            executive_summary: String(p.executive_summary ?? ""),
            user_topic_tag: String(p.user_topic_tag ?? ""),
            project_id: (p.project_id as string | null | undefined) ?? projectId,
            research_facets: rf,
            collection_ids: Array.isArray(p.collection_ids)
              ? (p.collection_ids as string[]).map(String)
              : [],
          };
        })
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load papers");
    } finally {
      setLoading(false);
    }
  }

  async function loadCollections() {
    try {
      const res = await fetch(`/api/projects/${projectId}/collections`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { items?: CollectionRow[]; unassigned?: number };
      setCollections(Array.isArray(json.items) ? json.items : []);
      setUnassignedCount(typeof json.unassigned === "number" ? json.unassigned : 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load collections");
    }
  }

  useEffect(() => {
    void load();
    void loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function toPreview(p: ProjectPaperRow): PaperPreviewData {
    return {
      paper_title: p.paper_title,
      authors: p.authors,
      executive_summary: p.executive_summary,
      research_facets: p.research_facets,
      user_topic_tag: p.user_topic_tag,
      project_id: p.project_id,
    };
  }

  async function removePaper(paperId: string) {
    try {
      const res = await fetch(`/api/archive/${paperId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Deleted.");
      setItems((prev) => prev.filter((p) => p.id !== paperId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const collectionById = new Map(collections.map((c) => [c.id, c]));
  const filtered =
    activeCollectionId === "all"
      ? items
      : activeCollectionId === "unassigned"
        ? items.filter((p) => !(p.collection_ids ?? []).length)
        : items.filter((p) => (p.collection_ids ?? []).includes(activeCollectionId));

  async function setPaperCollections(paperId: string, nextIds: string[]) {
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/${paperId}/collections`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collection_ids: nextIds, multi_assign: multiAssign }),
      });
      if (!res.ok) throw new Error(parseApiErrorText(await res.text()));
      await load();
      await loadCollections();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function bulkAssign(collectionId: string | null) {
    if (!selectedIds.length) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/collections/bulk`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paper_ids: selectedIds,
          collection_id: collectionId,
          mode: "replace",
        }),
      });
      if (!res.ok) throw new Error(parseApiErrorText(await res.text()));
      toast.success("Updated collections.");
      setSelected({});
      await load();
      await loadCollections();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed");
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collections</div>
        <button
          type="button"
          onClick={() => setActiveCollectionId("all")}
          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
            activeCollectionId === "all"
              ? "border-border bg-muted/60 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <span>All papers</span>
          <span className="text-xs">{items.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveCollectionId("unassigned")}
          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
            activeCollectionId === "unassigned"
              ? "border-border bg-muted/60 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <span>Unassigned</span>
          <span className="text-xs">{unassignedCount}</span>
        </button>
        <div className="pt-1">
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCollectionId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const paperId = e.dataTransfer.getData("text/paper-id");
                if (paperId) void setPaperCollections(paperId, [c.id]);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                activeCollectionId === c.id
                  ? "border-border bg-muted/60 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    c.color === "none" ? "bg-muted-foreground/40" : ""
                  }`}
                  style={
                    c.color === "indigo"
                      ? { backgroundColor: "oklch(0.72 0.1 260 / 0.9)" }
                      : c.color === "emerald"
                        ? { backgroundColor: "oklch(0.72 0.12 155 / 0.9)" }
                        : c.color === "fuchsia"
                          ? { backgroundColor: "oklch(0.72 0.12 330 / 0.9)" }
                          : c.color === "amber"
                            ? { backgroundColor: "oklch(0.78 0.12 85 / 0.9)" }
                            : c.color === "cyan"
                              ? { backgroundColor: "oklch(0.75 0.11 200 / 0.9)" }
                              : undefined
                  }
                />
                <span className="truncate">{c.name}</span>
              </span>
              <span className="text-xs">{c.paper_count}</span>
            </button>
          ))}
        </div>
        <Separator className="bg-border/50" />
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            onClick={() => {
              setNewCollectionName("");
              setNewCollectionColor("none");
              setCreateOpen(true);
            }}
          >
            + New collection
          </Button>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setMultiAssign((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <span className="font-medium text-foreground">Multi-assign</span>
              <span className="inline-flex items-center gap-1">
                {multiAssign ? <Check className="size-3.5" /> : null}
                {multiAssign ? "On" : "Off"}
              </span>
            </button>
            <div className="mt-2 text-[11px]">
              Off = one collection per paper. On = multiple chips.
            </div>
          </div>
        </div>
      </aside>

      <div className="space-y-4">
        <PaperFiltersBar
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
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            Showing {filtered.length} of {items.length}
          </span>
          <div className="flex items-center gap-2">
            {selectedIds.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button type="button" variant="secondary" size="sm">
                      Bulk assign ({selectedIds.length})
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Set collection</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => void bulkAssign(null)}>
                    Clear (unassigned)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {collections.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => void bulkAssign(c.id)}>
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
              Apply filters
            </Button>
          </div>
        </div>
        {!filtered.length ? (
          <div className="text-sm text-muted-foreground">No papers match this view/filters.</div>
        ) : null}

        {filtered.slice(0, 60).map((p) => (
        <div
          key={p.id}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
              <label className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(selected[p.id])}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSelected((cur) => ({ ...cur, [p.id]: e.target.checked }))}
                />
                Select
              </label>
            <div className="flex items-start gap-2">
              <button
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/paper-id", p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="mt-1 hidden cursor-grab rounded-lg border border-border/60 bg-muted/40 p-1.5 text-muted-foreground hover:text-foreground active:cursor-grabbing sm:inline-flex"
                aria-label="Drag to collection"
                title="Drag to a collection"
              >
                <GripVertical className="size-4" />
              </button>
              <PaperHoverPreview paper={toPreview(p)}>
                <Link
                  href={`/research/archive/${p.id}`}
                  className="block min-w-0 truncate text-lg font-semibold text-foreground hover:underline"
                >
                  {p.paper_title}
                </Link>
              </PaperHoverPreview>
            </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(p.collection_ids ?? []).slice(0, 3).map((cid) => {
                  const c = collectionById.get(cid);
                  if (!c) return null;
                  return (
                    <Badge
                      key={cid}
                      variant="outline"
                      className={`h-7 border ${collectionBadgeClass(c.color)}`}
                    >
                      {c.name}
                    </Badge>
                  );
                })}
                {(p.collection_ids ?? []).length > 3 ? (
                  <Badge variant="outline" className="h-7 border border-border bg-muted/40 text-muted-foreground">
                    +{(p.collection_ids ?? []).length - 3}
                  </Badge>
                ) : null}
              </div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1">
                {p.source_type.toUpperCase()}
              </span>
              <span className="rounded-full border border-border bg-muted/50 px-3 py-1">
                {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
              </span>
              {(p.keywords ?? []).slice(0, 4).map((k) => (
                <span
                  key={k}
                  className="max-w-full break-words rounded-full border border-border bg-muted/50 px-3 py-1"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="secondary" size="sm">
                        <MoreHorizontal className="mr-2 size-4" />
                        Collections
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Assign</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => void setPaperCollections(p.id, [])}>
                      Clear (unassigned)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {collections.map((c) => {
                      const on = (p.collection_ids ?? []).includes(c.id);
                      return (
                        <DropdownMenuItem
                          key={c.id}
                          onClick={() => {
                            const cur = p.collection_ids ?? [];
                            const next = on
                              ? cur.filter((x) => x !== c.id)
                              : multiAssign
                                ? [...cur, c.id]
                                : [c.id];
                            void setPaperCollections(p.id, next);
                          }}
                        >
                          {on ? "✓ " : ""}
                          {c.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <ButtonLink href={`/research/archive/${p.id}`} variant="secondary">
                  Edit
                </ButtonLink>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive">
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  }
                  title="Delete this paper?"
                  description="This permanently removes the paper summary and related logs/insights."
                  confirmText="Delete"
                  destructive
                  onConfirm={() => removePaper(p.id)}
                />
              </div>
        </div>
      ))}
    </div>
    </div>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Create a topic group inside this project. Papers can remain unassigned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">Collection name</div>
              <Input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Knowledge Graphs"
                className="mt-2 bg-muted/55"
                autoFocus
              />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Color (optional)</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "none", label: "No color", className: "bg-muted/40 ring-1 ring-border/60" },
                    {
                      id: "indigo",
                      label: "Indigo",
                      className:
                        "bg-gradient-to-br from-indigo-500/20 via-indigo-400/10 to-transparent ring-1 ring-indigo-400/25",
                    },
                    {
                      id: "emerald",
                      label: "Emerald",
                      className:
                        "bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent ring-1 ring-emerald-400/25",
                    },
                    {
                      id: "fuchsia",
                      label: "Fuchsia",
                      className:
                        "bg-gradient-to-br from-fuchsia-500/20 via-fuchsia-400/10 to-transparent ring-1 ring-fuchsia-400/25",
                    },
                    {
                      id: "amber",
                      label: "Amber",
                      className:
                        "bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent ring-1 ring-amber-400/25",
                    },
                    {
                      id: "cyan",
                      label: "Cyan",
                      className:
                        "bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-transparent ring-1 ring-cyan-400/25",
                    },
                  ] as Array<{ id: CollectionRow["color"]; label: string; className: string }>
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setNewCollectionColor(opt.id)}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-foreground transition ${
                      opt.className
                    } ${newCollectionColor === opt.id ? "outline outline-2 outline-foreground/30" : "hover:brightness-110"}`}
                    aria-pressed={newCollectionColor === opt.id}
                  >
                    <span className="truncate">{opt.label}</span>
                    {newCollectionColor === opt.id ? <Check className="size-4 text-foreground/80" /> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={creating || !newCollectionName.trim()}
                onClick={async () => {
                  setCreating(true);
                  try {
                    const res = await fetch(`/api/projects/${projectId}/collections`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ name: newCollectionName.trim(), color: newCollectionColor }),
                    });
                    if (!res.ok) throw new Error(parseApiErrorText(await res.text()));
                    toast.success("Collection created.");
                    setCreateOpen(false);
                    await loadCollections();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Create failed");
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectInsightsOverview({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/insights`);
        if (!res.ok) throw new Error(await res.text());
        setData(await res.json());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load insights");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [projectId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data?.items?.length)
    return (
      <div className="text-sm text-muted-foreground">
        No insights yet. Scan a paper into the project to generate project-relative insights.
      </div>
    );

  const aggregates = data.aggregates ?? {};

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {(data.items as any[]).slice(0, 8).map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-muted/50 p-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">
                Fit: {i.fit_area || "—"}
              </span>
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1">
                Priority: {i.priority_level || "—"}
              </span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{i.project_fit_summary || "—"}</div>
            <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
              {i.relevance_explanation || "—"}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-muted/50 p-4">
          <div className="text-xs font-medium tracking-wide text-muted-foreground">Top keywords</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(aggregates.top_keywords ?? []).slice(0, 12).map(([k, n]: [string, number]) => (
              <span
                key={k}
                className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
                title={`${n} occurrences`}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-muted/50 p-4">
          <div className="text-xs font-medium tracking-wide text-muted-foreground">Next actions</div>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {(aggregates.top_actions ?? []).slice(0, 8).map(([a]: [string, number]) => (
              <li key={a} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/25" />
                <span className="min-w-0">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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

