"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ArchiveQuery } from "@/services/repositories/paper-repo";
import type { PaperSummaryRecord } from "@/types/papers";
import { PERFORMANCE_LEVELS, type PerformanceLevel } from "@/types/research-facets";

const CONF: PaperSummaryRecord["scan_confidence"][] = ["very_low", "low", "medium", "high"];

const METHOD_PRESETS = ["RL", "CNN", "Transformer", "GNN", "Diffusion", "LLM"];

export type PaperFiltersBarProps = {
  showSourceType?: boolean;
  methodsCsv: string;
  onMethodsCsv: (v: string) => void;
  datasetsCsv: string;
  onDatasetsCsv: (v: string) => void;
  performanceLevels: PerformanceLevel[];
  onTogglePerformance: (p: PerformanceLevel) => void;
  confidenceLevels: PaperSummaryRecord["scan_confidence"][];
  onToggleConfidence: (c: PaperSummaryRecord["scan_confidence"]) => void;
  sort: NonNullable<ArchiveQuery["sort"]>;
  onSort: (s: NonNullable<ArchiveQuery["sort"]>) => void;
  onClearSmart: () => void;
};

export function PaperFiltersBar({
  showSourceType = false,
  methodsCsv,
  onMethodsCsv,
  datasetsCsv,
  onDatasetsCsv,
  performanceLevels,
  onTogglePerformance,
  confidenceLevels,
  onToggleConfidence,
  sort,
  onSort,
  onClearSmart,
}: PaperFiltersBarProps) {
  const hasSmart =
    methodsCsv.trim() ||
    datasetsCsv.trim() ||
    performanceLevels.length > 0 ||
    confidenceLevels.length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Smart filters
        </div>
        {hasSmart ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onClearSmart}>
            <X className="size-3.5" />
            Clear smart filters
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-muted-foreground">Methods (comma-separated)</Label>
          <Input
            value={methodsCsv}
            onChange={(e) => onMethodsCsv(e.target.value)}
            placeholder="e.g. RL, Transformer"
            className="mt-1.5 bg-muted/55"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {METHOD_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  const parts = methodsCsv
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean);
                  if (parts.some((p) => p.toLowerCase() === m.toLowerCase())) return;
                  onMethodsCsv([...parts, m].join(", "));
                }}
                className="rounded-full border border-border/80 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                +{m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground">Datasets (comma-separated)</Label>
          <Input
            value={datasetsCsv}
            onChange={(e) => onDatasetsCsv(e.target.value)}
            placeholder="e.g. ImageNet, COCO"
            className="mt-1.5 bg-muted/55"
          />
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground">Performance (extracted)</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PERFORMANCE_LEVELS.map((p) => {
            const on = performanceLevels.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePerformance(p)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                  on
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.replace("sota", "SOTA")}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground">Scan confidence</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONF.map((c) => {
            const on = confidenceLevels.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => onToggleConfidence(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  on
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/50" />

      <div className="flex flex-wrap items-center gap-3">
        <Label className="shrink-0 text-muted-foreground">Sort</Label>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as NonNullable<ArchiveQuery["sort"]>)}
          className="rounded-xl border border-border bg-muted/55 px-3 py-2 text-sm text-foreground"
        >
          <option value="created_desc">Newest saved</option>
          <option value="opened_desc">Recently opened</option>
          <option value="title_asc">Title A–Z</option>
        </select>
        {showSourceType ? (
          <span className="text-xs text-muted-foreground">Use source buttons above for PDF/URL/Text.</span>
        ) : null}
      </div>
    </div>
  );
}

export function appendSmartParams(
  sp: URLSearchParams,
  input: {
    methodsCsv: string;
    datasetsCsv: string;
    performanceLevels: PerformanceLevel[];
    confidenceLevels: PaperSummaryRecord["scan_confidence"][];
    sort: NonNullable<ArchiveQuery["sort"]>;
  }
) {
  const methods = input.methodsCsv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const datasets = input.datasetsCsv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (methods.length) sp.set("methods", methods.join(","));
  if (datasets.length) sp.set("datasets", datasets.join(","));
  if (input.performanceLevels.length) sp.set("performanceLevels", input.performanceLevels.join(","));
  if (input.confidenceLevels.length) sp.set("confidenceLevels", input.confidenceLevels.join(","));
  sp.set("sort", input.sort);
}
