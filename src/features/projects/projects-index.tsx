"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FolderKanban, Plus, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.string(),
  project_type: z.string(),
  objective: z.string(),
  thesis_direction: z.string(),
  primary_topics: z.array(z.string()),
  accent: z.enum(["indigo", "emerald", "fuchsia", "amber", "cyan"]),
  updated_at: z.coerce.date(),
});

const ListSchema = z.object({ items: z.array(ProjectSchema) });

const accentGlow: Record<string, string> = {
  indigo: "from-primary/12 to-accent/8",
  emerald: "from-emerald-600/10 to-teal-600/6",
  fuchsia: "from-stone-500/10 to-amber-900/6",
  amber: "from-amber-600/10 to-stone-500/6",
  cyan: "from-sky-600/8 to-slate-600/6",
};

export function ProjectsIndex() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<z.infer<typeof ProjectSchema>[]>([]);

  async function load() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`/api/projects?${sp.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const parsed = ListSchema.safeParse(json);
      if (!parsed.success) throw new Error("Unexpected projects response.");
      setItems(parsed.data.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const active = items.filter((p) => p.status === "active").length;
    return { total: items.length, active };
  }, [items]);

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <FolderKanban className="size-4 text-muted-foreground" />
            Project Mode
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Project workspaces
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
            Not folders—active research command centers. Scan papers relative to a
            thesis direction, generate project-aware insights, and keep writing/implementation aligned.
          </p>
        </div>

        <div className="flex gap-2">
          <ButtonLink href="/projects/new">
            <Plus className="mr-2 size-4" />
            New project
          </ButtonLink>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base text-muted-foreground">
            <span className="font-medium text-foreground">{summary.total}</span> total ·{" "}
            <span className="font-medium text-foreground">{summary.active}</span> active
          </div>
          <div className="flex w-full max-w-xl items-center gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 size-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects…"
                className="bg-muted/55 pl-11"
              />
            </div>
            <button
              onClick={() => void load()}
              className="rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/70"
            >
              {loading ? "…" : "Go"}
            </button>
          </div>
        </div>
      </Card>

      {items.length === 0 && !loading ? (
        <Card className="rounded-3xl border-border bg-card/85 p-10 text-center backdrop-blur">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border bg-muted/50">
            <FolderKanban className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 text-base font-medium text-foreground">
            Create your first workspace
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Add your thesis direction, research questions, and implementation goals—then scan papers into it.
          </div>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/projects/new">
              <Plus className="mr-2 size-4" /> New project
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <Card className="group relative h-full overflow-hidden rounded-3xl border-border/80 bg-card/95 p-7 shadow-md ring-1 ring-border/40 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 ${accentGlow[p.accent]}`}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-xl font-semibold tracking-tight text-foreground">
                      {p.title}
                    </div>
                    <div className="mt-2 line-clamp-3 text-base leading-relaxed text-muted-foreground">
                      {p.description || p.objective || "—"}
                    </div>
                  </div>
                  <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>

                <Separator className="my-5 bg-border/50" />

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                    {p.status}
                  </span>
                  <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
                    {p.project_type.replace("_", " ")}
                  </span>
                  {(p.primary_topics ?? []).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-5 text-sm text-muted-foreground">
                  Updated {new Date(p.updated_at).toLocaleString()}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

