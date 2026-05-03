"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BookOpen, FileText, FolderKanban, Loader2, ScanSearch, StickyNote } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fuzzyScore } from "@/lib/fuzzy-match";
import { cn } from "@/lib/utils";

type SearchHit = { id: string; title: string; subtitle: string; href: string };
type ActivityRow = {
  id: string;
  kind: string;
  label: string;
  href: string;
};

type Row =
  | { type: "action"; id: string; title: string; subtitle?: string; href: string }
  | { type: "paper"; id: string; title: string; subtitle: string; href: string }
  | { type: "project"; id: string; title: string; subtitle: string; href: string }
  | { type: "note"; id: string; title: string; subtitle: string; href: string }
  | { type: "recent"; id: string; title: string; subtitle: string; href: string };

const STATIC_ACTIONS: Row[] = [
  {
    type: "action",
    id: "scan",
    title: "Scan new paper",
    subtitle: "Upload, URL, or paste text",
    href: "/research/scanner",
  },
  {
    type: "action",
    id: "archive",
    title: "Open archive",
    subtitle: "Browse saved papers",
    href: "/research/archive",
  },
  {
    type: "action",
    id: "dash",
    title: "Open dashboard",
    subtitle: "Research home",
    href: "/",
  },
  {
    type: "action",
    id: "projects",
    title: "Go to projects",
    subtitle: "Workspaces & scans",
    href: "/projects",
  },
  {
    type: "action",
    id: "new-project",
    title: "Create project",
    subtitle: "Start a workspace",
    href: "/projects/new",
  },
];

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

const CommandPaletteCtx = createContext<{ openPalette: () => void } | null>(null);

export function useCommandPalette() {
  const v = useContext(CommandPaletteCtx);
  if (!v) throw new Error("useCommandPalette requires CommandPaletteProvider");
  return v;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandPaletteCtx.Provider value={{ openPalette: () => setOpen(true) }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteCtx.Provider>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<SearchHit[]>([]);
  const [projects, setProjects] = useState<SearchHit[]>([]);
  const [notes, setNotes] = useState<SearchHit[]>([]);
  const [recent, setRecent] = useState<ActivityRow[]>([]);
  const [sel, setSel] = useState(0);

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) return;
      const json = (await res.json()) as { items?: ActivityRow[] };
      setRecent(json.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    void loadRecent();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, loadRecent]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (!q.trim()) {
        setPapers([]);
        setProjects([]);
        setNotes([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=10`);
          if (!res.ok) throw new Error();
          const json = (await res.json()) as {
            papers: SearchHit[];
            projects: SearchHit[];
            notes: SearchHit[];
          };
          setPapers(json.papers ?? []);
          setProjects(json.projects ?? []);
          setNotes(json.notes ?? []);
        } catch {
          setPapers([]);
          setProjects([]);
          setNotes([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 180);
    return () => window.clearTimeout(t);
  }, [q, open]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const actions = needle
      ? STATIC_ACTIONS.filter(
          (a) =>
            fuzzyScore(needle, `${a.title} ${a.subtitle ?? ""}`) > 0 ||
            `${a.title} ${a.subtitle ?? ""}`.toLowerCase().includes(needle)
        )
      : STATIC_ACTIONS;

    const resume: Row[] =
      recent[0] && !needle
        ? [
            {
              type: "recent",
              id: `resume-${recent[0].id}`,
              title: "Resume recent work",
              subtitle: recent[0].label,
              href: recent[0].href,
            },
          ]
        : [];

    const recRows: Row[] =
      !needle && recent.length
        ? recent.slice(0, 6).map((r) => ({
            type: "recent",
            id: r.id,
            title: r.label,
            subtitle: r.kind,
            href: r.href,
          }))
        : [];

    const pRows: Row[] = papers.map((p) => ({
      type: "paper",
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
    }));
    const prRows: Row[] = projects.map((p) => ({
      type: "project",
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      href: p.href,
    }));
    const nRows: Row[] = notes.map((n) => ({
      type: "note",
      id: n.id,
      title: n.title,
      subtitle: n.subtitle,
      href: n.href,
    }));

    return [...resume, ...actions, ...recRows, ...pRows, ...prRows, ...nRows];
  }, [q, papers, projects, notes, recent]);

  useEffect(() => {
    setSel((s) => (rows.length ? Math.min(s, rows.length - 1) : 0));
  }, [rows.length, q, open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (e.key === "Enter" && rows[sel]) {
      e.preventDefault();
      go(rows[sel].href);
    }
  };

  const groupIcon = (r: Row) => {
    if (r.type === "paper") return FileText;
    if (r.type === "project") return FolderKanban;
    if (r.type === "note") return StickyNote;
    if (r.type === "recent") return BookOpen;
    return ScanSearch;
  };

  const groupLabel = (r: Row) => {
    if (r.type === "action") return "Actions";
    if (r.type === "recent") return "Recently active";
    if (r.type === "paper") return "Papers";
    if (r.type === "project") return "Projects";
    return "Notes";
  };

  let lastGroup = "";
  const list = rows.map((r, i) => {
    const gl = groupLabel(r);
    const showHead = gl !== lastGroup;
    lastGroup = gl;
    const Icon = groupIcon(r);
    return (
      <div key={`${r.type}-${r.id}`}>
        {showHead ? (
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {gl}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => go(r.href)}
          onMouseEnter={() => setSel(i)}
          className={cn(
            "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
            i === sel ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Icon className="mt-0.5 size-4 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{r.title}</span>
            {r.subtitle ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{r.subtitle}</span>
            ) : null}
          </span>
        </button>
      </div>
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton>
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle className="text-lg">Command palette</DialogTitle>
          <DialogDescription className="text-sm">
            Search papers, projects, and notes. Use arrows and Enter. Press Esc to close.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-2 pt-3">
          <div className="relative">
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search or jump…"
              className="h-11 bg-muted/50 pr-10 text-base"
            />
            {loading ? (
              <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-2 pb-4">
          {list.length ? (
            list
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {q.trim()
                ? "No matches. Try another phrase or open the archive."
                : "Type to search, or pick an action below."}
            </div>
          )}
        </div>
        <div className="border-t border-border/60 bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0.5 font-mono">⌘K</span>{" "}
          <span className="mx-1">·</span>
          <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0.5 font-mono">Ctrl K</span>{" "}
          <span className="mx-1">·</span>
          <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0.5 font-mono">/</span> when not
          typing
        </div>
      </DialogContent>
    </Dialog>
  );
}
