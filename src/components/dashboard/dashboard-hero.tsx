"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, FileUp, Link2, Loader2, Sparkles, Type } from "lucide-react";
import { z } from "zod";

import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";

const StatsSchema = z.object({
  papers_this_week: z.number(),
  active_projects: z.number(),
  total_projects: z.number(),
  recent_papers: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      href: z.string(),
      created_at: z.coerce.date(),
      scan_confidence: z.string(),
    })
  ),
  decay_papers: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      href: z.string(),
      last_opened_at: z.coerce.date().nullable(),
    })
  ),
  top_topics: z.array(z.object({ label: z.string(), count: z.number() })),
  low_confidence: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      href: z.string(),
      scan_confidence: z.string(),
    })
  ),
  recent_activity: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      label: z.string(),
      href: z.string(),
      last_active_at: z.coerce.date(),
    })
  ),
  recent_projects: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      href: z.string(),
      updated_at: z.coerce.date(),
    })
  ),
});

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function DashboardHero() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<z.infer<typeof StatsSchema> | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed to load stats");
        const json = await res.json();
        const parsed = StatsSchema.safeParse(json);
        setStats(parsed.success ? parsed.data : null);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topicLabel =
    stats?.top_topics?.length && stats.top_topics[0]
      ? `${stats.top_topics[0].label} · +${Math.max(0, stats.top_topics.length - 1)} more`
      : "Add topic tags while scanning";

  return (
    <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-card/95 p-8 shadow-lg ring-1 ring-border/50 backdrop-blur-sm sm:p-10 lg:p-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_circle_at_12%_12%,oklch(0.55_0.04_75_/_0.14),transparent_58%),radial-gradient(600px_circle_at_88%_8%,oklch(0.5_0.035_195_/_0.09),transparent_55%)]" />

      <div className="relative">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <span className="size-2 rounded-full bg-primary/80" />
              Research OS Dashboard
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Aroha Flow – Research OS
            </h1>
            <p className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
              Scan papers into structured understanding. Resume where you left off, filter your archive with research
              metadata, and keep writing tied to the same papers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/research/scanner" variant="secondary">
              <FileUp className="mr-2 size-4" />
              Upload Paper
              <ArrowUpRight className="ml-2 size-4 opacity-70" />
            </ButtonLink>
            <ButtonLink href="/research/scanner?mode=url" variant="secondary">
              <Link2 className="mr-2 size-4" />
              Paste Link
            </ButtonLink>
            <ButtonLink href="/research/scanner?mode=text" variant="secondary">
              <Type className="mr-2 size-4" />
              Paste Text
            </ButtonLink>
            <ButtonLink href="/research/archive">
              <BookOpen className="mr-2 size-4" />
              Open Archive
            </ButtonLink>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full flex items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Loading dashboard metrics…
            </div>
          ) : stats ? (
            <>
              <StatCard
                label="Papers scanned this week"
                value={formatNumber(stats.papers_this_week)}
                hint="Fresh captures in the last 7 days."
                accent="emerald"
              />
              <StatCard
                label="Active projects"
                value={formatNumber(stats.active_projects)}
                hint={`${formatNumber(stats.total_projects)} workspaces total.`}
                accent="indigo"
              />
              <StatCard
                label="Most used topics"
                value={topicLabel}
                hint="From your archive tags and keywords."
                accent="fuchsia"
              />
              <StatCard
                label="Needs revisit"
                value={formatNumber(stats.decay_papers.length)}
                hint="Saved a while ago, not opened recently."
                accent="amber"
              />
            </>
          ) : (
            <div className="col-span-full rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              Could not load live stats. Open the archive or run a scan to populate data.
            </div>
          )}
        </div>

        {stats && !loading ? (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-muted/35 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                Continue where you left off
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {stats.recent_activity.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link href={a.href} className="block rounded-xl border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50">
                      <span className="font-medium text-foreground">{a.label}</span>
                      <span className="mt-0.5 block text-xs capitalize text-muted-foreground">{a.kind}</span>
                    </Link>
                  </li>
                ))}
                {!stats.recent_activity.length ? (
                  <li className="text-muted-foreground">Open a paper or project to build your trail.</li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted/35 p-6">
              <div className="text-sm font-semibold text-foreground">Signals & next steps</div>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                    Recent papers
                  </div>
                  <ul className="mt-2 space-y-2">
                    {stats.recent_papers.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <Link href={p.href} className="text-foreground underline-offset-4 hover:underline">
                          {p.title}
                        </Link>
                        <span className="ml-2 text-xs">· {p.scan_confidence.replace("_", " ")}</span>
                      </li>
                    ))}
                    {!stats.recent_papers.length ? <li>Scan your first paper to populate this list.</li> : null}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                    Stale / high-value decay
                  </div>
                  <ul className="mt-2 space-y-2">
                    {stats.decay_papers.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <Link href={p.href} className="text-foreground underline-offset-4 hover:underline">
                          {p.title}
                        </Link>
                      </li>
                    ))}
                    {!stats.decay_papers.length ? (
                      <li>No decay candidates yet — great for early archives.</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                    Low-confidence scans
                  </div>
                  <ul className="mt-2 space-y-2">
                    {stats.low_confidence.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <Link href={p.href} className="text-foreground underline-offset-4 hover:underline">
                          {p.title}
                        </Link>
                      </li>
                    ))}
                    {!stats.low_confidence.length ? <li>Nothing flagged as low confidence.</li> : null}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                    Active projects
                  </div>
                  <ul className="mt-2 space-y-2">
                    {stats.recent_projects.slice(0, 4).map((p) => (
                      <li key={p.id}>
                        <Link href={p.href} className="text-foreground underline-offset-4 hover:underline">
                          {p.title}
                        </Link>
                      </li>
                    ))}
                    {!stats.recent_projects.length ? (
                      <li>
                        <Link href="/projects/new" className="underline-offset-4 hover:underline">
                          Create a project workspace
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
