"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type PaperPreviewData = {
  paper_title: string;
  authors: string;
  executive_summary: string;
  research_facets: {
    methods: string[];
    datasets: string[];
    performance_level: string;
    core_contribution: string;
    key_result: string;
  };
  user_topic_tag: string;
  project_id: string | null;
  project_title?: string | null;
};

function clip(s: string, n: number) {
  const t = s?.trim() ?? "";
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

export function PaperHoverPreview({
  paper,
  children,
}: {
  paper: PaperPreviewData;
  children: React.ReactNode;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hoverCapable, setHoverCapable] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverCapable(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clearLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };

  const onEnter = useCallback(
    (e: React.MouseEvent) => {
      if (!hoverCapable) return;
      clearLeave();
      setCoords({ x: e.clientX, y: e.clientY });
      setOpen(true);
    },
    [hoverCapable]
  );

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (!open || !hoverCapable) return;
      setCoords({ x: e.clientX, y: e.clientY });
    },
    [open, hoverCapable]
  );

  const onLeave = () => {
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const pad = 12;
  const width = Math.min(380, vw - pad * 2);
  let left = coords.x + pad;
  let top = coords.y + pad;
  if (left + width > vw - pad) left = Math.max(pad, coords.x - width - pad);
  if (top + 280 > vh - pad) top = Math.max(pad, vh - 280 - pad);

  const panel = open && hoverCapable && (
    <div
      role="tooltip"
      id={`${uid}-tip`}
      style={{ left, top, width }}
      className="fixed z-[70] max-h-[min(70vh,320px)] overflow-y-auto rounded-2xl border border-border/80 bg-card/95 p-4 text-sm shadow-xl ring-1 ring-border/50 backdrop-blur-md pointer-events-none"
      onMouseEnter={clearLeave}
      onMouseLeave={onLeave}
    >
      <div className="font-semibold leading-snug text-foreground">{paper.paper_title}</div>
      {paper.authors?.trim() ? (
        <div className="mt-1 text-xs text-muted-foreground">{paper.authors}</div>
      ) : null}
      <div className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {clip(paper.executive_summary, 420) || "—"}
      </div>
      {paper.research_facets.core_contribution?.trim() ? (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Contribution
          </div>
          <div className="mt-1 text-xs text-foreground/90">
            {clip(paper.research_facets.core_contribution, 280)}
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {(paper.research_facets.methods ?? []).slice(0, 5).map((m) => (
          <span key={m} className="rounded-md bg-muted/60 px-2 py-0.5">
            {m}
          </span>
        ))}
        {(paper.research_facets.datasets ?? []).slice(0, 3).map((d) => (
          <span key={d} className="rounded-md bg-muted/60 px-2 py-0.5">
            {d}
          </span>
        ))}
        <span className="rounded-md bg-muted/60 px-2 py-0.5 capitalize">
          perf: {paper.research_facets.performance_level}
        </span>
      </div>
      {paper.research_facets.key_result?.trim() ? (
        <div className="mt-2 text-xs text-foreground/85">
          <span className="font-medium text-muted-foreground">Key result: </span>
          {clip(paper.research_facets.key_result, 200)}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
        {paper.user_topic_tag?.trim() ? (
          <span className="rounded-full border border-border px-2 py-0.5">Topic: {paper.user_topic_tag}</span>
        ) : null}
        {paper.project_id ? (
          <span className="rounded-full border border-border px-2 py-0.5">
            Project: {paper.project_title?.trim() || paper.project_id.slice(0, 8)}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <span
        className="relative inline max-w-full"
        onMouseEnter={onEnter}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        aria-describedby={open ? `${uid}-tip` : undefined}
      >
        {children}
      </span>
      {typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </>
  );
}
