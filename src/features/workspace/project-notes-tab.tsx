"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ButtonLink } from "@/components/ui/button-link";

const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  paper_summary_id: z.string().nullable(),
  updated_at: z.coerce.date(),
});

export function ProjectNotesTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<z.infer<typeof NoteSchema>[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { items?: unknown[] };
      const parsed = (json.items ?? [])
        .map((row) => NoteSchema.safeParse(row))
        .filter((x) => x.success)
        .map((x) => x.data);
      setItems(parsed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createNote() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTitle("");
      setContent("");
      toast.success("Note created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(n: z.infer<typeof NoteSchema>, patch: { title?: string; content?: string }) {
    try {
      const res = await fetch(`/api/projects/${projectId}/notes/${n.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (loading) {
    return (
      <Card className="rounded-3xl border-border bg-card/85 p-8 backdrop-blur">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading notes…
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
        <div className="text-sm font-medium text-foreground">New note</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Fast capture — link to a paper from the paper detail page later via archive edits if needed.
        </p>
        <Separator className="my-4 bg-muted/50" />
        <div className="space-y-3">
          <div>
            <Label className="text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 bg-muted/50" />
          </div>
          <div>
            <Label className="text-muted-foreground">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 min-h-28 bg-muted/50"
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void createNote()}>
            <Plus className="mr-2 size-4" />
            Add note
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
        <div className="text-sm font-medium text-foreground">Project notes</div>
        <Separator className="my-4 bg-muted/50" />
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((n) => (
              <NoteRow key={n.id} note={n} onSave={(patch) => void saveNote(n, patch)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function NoteRow({
  note,
  onSave,
}: {
  note: z.infer<typeof NoteSchema>;
  onSave: (patch: { title?: string; content?: string }) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  return (
    <li className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background/50 font-medium" />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-24 bg-background/50" />
          {note.paper_summary_id ? (
            <ButtonLink href={`/research/archive/${note.paper_summary_id}`} variant="secondary" className="text-xs">
              Open linked paper
            </ButtonLink>
          ) : null}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onSave({ title, content })}>
          <Save className="mr-2 size-3.5" />
          Save
        </Button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">Updated {note.updated_at.toLocaleString()}</div>
    </li>
  );
}
