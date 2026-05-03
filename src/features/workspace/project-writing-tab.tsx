"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, PlusCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPaperCitation, type CitationStyleId } from "@/lib/citations";
import { cn } from "@/lib/utils";

const WritingSchema = z.object({
  body: z.string(),
  lit_review_draft: z.string(),
  citation_style: z.enum(["apa-lite", "mla-lite", "chi"]),
  lit_review_generated_at: z.coerce.date().nullable(),
  lit_review_source_hash: z.string(),
});

const PaperMini = z.object({
  id: z.string(),
  paper_title: z.string(),
  authors: z.string(),
});

export function ProjectWritingTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState("");
  const [litDraft, setLitDraft] = useState("");
  const [citationStyle, setCitationStyle] = useState<CitationStyleId>("apa-lite");
  const [genAt, setGenAt] = useState<Date | null>(null);
  const [papers, setPapers] = useState<z.infer<typeof PaperMini>[]>([]);
  const [citeOpen, setCiteOpen] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const selRef = useRef({ start: 0, end: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/writing`),
        fetch(`/api/projects/${projectId}/papers?limit=80`),
      ]);
      if (!wRes.ok) throw new Error(await wRes.text());
      if (!pRes.ok) throw new Error(await pRes.text());
      const wJson = (await wRes.json()) as { writing?: z.infer<typeof WritingSchema> };
      const pJson = (await pRes.json()) as { items?: unknown[] };
      const w = wJson.writing;
      if (!w) throw new Error("No writing doc");
      const parsed = WritingSchema.safeParse(w);
      if (!parsed.success) throw new Error("Unexpected writing payload");
      setBody(parsed.data.body);
      setLitDraft(parsed.data.lit_review_draft);
      setCitationStyle(parsed.data.citation_style as CitationStyleId);
      setGenAt(parsed.data.lit_review_generated_at);
      const items = (pJson.items ?? [])
        .map((row) => PaperMini.safeParse(row))
        .filter((x) => x.success)
        .map((x) => x.data);
      setPapers(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load writing");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchWriting(patch: Partial<{ body: string; lit_review_draft: string; citation_style: string }>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/writing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function captureSelection() {
    const el = taRef.current;
    if (!el) return;
    selRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }

  function insertCitation(snippet: string) {
    const { start, end } = selRef.current;
    const next = body.slice(0, start) + snippet + body.slice(end);
    setBody(next);
    void patchWriting({ body: next });
    setCiteOpen(false);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      const pos = start + snippet.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function generateLitReview() {
    setGenBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/writing/lit-review`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof (json as { userMessage?: string }).userMessage === "string"
            ? (json as { userMessage: string }).userMessage
            : (json as { error?: string }).error === "no_papers"
              ? "Add papers to this project first."
              : "Generation failed.";
        throw new Error(msg);
      }
      const w = (json as { writing?: z.infer<typeof WritingSchema> }).writing;
      if (w) {
        setLitDraft(w.lit_review_draft);
        setGenAt(w.lit_review_generated_at);
      }
      toast.success("Literature review draft generated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-8 backdrop-blur">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading writing workspace…
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Writing and synthesis</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft prose with quick citations from project papers. Generated literature reviews stay separate until you
              insert them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setCiteOpen(true)}>
              <PlusCircle className="mr-2 size-4" />
              Insert citation
            </Button>
          </div>
        </div>
        <Separator className="my-5 bg-muted/50" />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-muted-foreground">Citation style</Label>
            <select
              value={citationStyle}
              onChange={(e) => {
                const v = e.target.value as CitationStyleId;
                setCitationStyle(v);
                void patchWriting({ citation_style: v });
              }}
              className="rounded-xl border border-border bg-muted/55 px-3 py-2 text-sm"
            >
              <option value="apa-lite">APA (lite)</option>
              <option value="mla-lite">MLA (lite)</option>
              <option value="chi">Chicago (lite)</option>
            </select>
            {saving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
          </div>
          <Textarea
            ref={taRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onSelect={captureSelection}
            onKeyUp={captureSelection}
            onBlur={() => void patchWriting({ body })}
            placeholder="Write here: thesis notes, lit review prose, or chapter drafts."
            className="min-h-[280px] bg-muted/40 text-base leading-relaxed"
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" />
          Literature review draft
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Grounded on papers linked to this project. Regenerating replaces the AI draft only. Your main editor above is
          untouched.
        </p>
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={genBusy}
          onClick={() => void generateLitReview()}
        >
          {genBusy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <BookOpen className="mr-2 size-4" /> Generate from project papers
            </>
          )}
        </Button>
        {genAt ? (
          <p className="mt-2 text-[11px] text-muted-foreground">Last generated {genAt.toLocaleString()}</p>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">No generation yet.</p>
        )}
        <Separator className="my-4 bg-muted/50" />
        <Textarea
          value={litDraft}
          onChange={(e) => setLitDraft(e.target.value)}
          onBlur={() => void patchWriting({ lit_review_draft: litDraft })}
          placeholder="Generated markdown appears here. Edit freely."
          className="min-h-[220px] bg-muted/40 text-sm leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!litDraft.trim()}
            onClick={() => insertCitation(`${litDraft.trim()}\n\n`)}
          >
            Insert draft into editor
          </Button>
        </div>
      </Card>

      <Dialog open={citeOpen} onOpenChange={setCiteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cite a project paper</DialogTitle>
            <DialogDescription>
              Inserts a compact citation at your last cursor position in the main editor.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {papers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No papers in this project yet.</p>
            ) : (
              papers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    insertCitation(
                      `${formatPaperCitation(citationStyle, {
                        paper_title: p.paper_title,
                        authors: p.authors,
                      })}\n`
                    )
                  }
                  className={cn(
                    "w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-sm transition hover:bg-muted/60"
                  )}
                >
                  <div className="font-medium text-foreground">{p.paper_title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.authors || "Authors unknown"}</div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
