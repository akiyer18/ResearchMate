"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Link2,
  Loader2,
  Sparkles,
  Type,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UploadZone } from "@/components/shared/upload-zone";
import { toast } from "sonner";

type SourceMode = "pdf" | "url" | "text";

const AnalyzeResponseSchema = z.object({
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().nullable(),
  generated_at: z.string(),
  content_type: z.enum(["research_paper", "article", "unknown"]).optional(),
  scan_meta: z.record(z.string(), z.unknown()).optional(),
  research_facets: z.record(z.string(), z.unknown()).optional(),
  analysis: z.object({
    title: z.string(),
    authors: z.string(),
    abstract_or_overview: z.string(),
    methodology: z.string(),
    results: z.string(),
    discussion: z.string(),
    future_work: z.string(),
    key_takeaways: z.array(z.string()),
    keywords: z.array(z.string()),
    important_concepts: z.array(z.string()),
    confidence_notes: z.string(),
    processing_model: z.string(),
    confidence: z.string(),
  }),
});

const LogBodySchema = z.object({
  paper_title: z.string().min(1),
  authors: z.string().optional(),
  source_type: z.enum(["pdf", "url", "text"]),
  source_url: z.string().nullable().optional(),
  extracted_text_excerpt: z.string().nullable().optional(),

  executive_summary: z.string().optional(),
  methodology_summary: z.string().optional(),
  results_summary: z.string().optional(),
  discussion_summary: z.string().optional(),
  future_work_summary: z.string().optional(),

  key_takeaways: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  important_concepts: z.array(z.string()).optional(),

  user_notes: z.string().optional(),
  reason_for_reading: z.string().optional(),
  user_topic_tag: z.string().optional(),

  processing_model: z.string().optional(),
  processing_status: z.string().optional(),
  scan_confidence: z.enum(["very_low", "low", "medium", "high"]).optional(),

  content_type: z.enum(["research_paper", "article", "unknown"]).optional(),
  scan_meta: z.record(z.string(), z.unknown()).optional(),
  research_facets: z.record(z.string(), z.unknown()).optional(),
});

type AnalyzeState =
  | { status: "idle" }
  | { status: "ingesting" | "extracting" | "analyzing" | "formatting"; progress: number }
  | { status: "done"; data: z.infer<typeof AnalyzeResponseSchema>; paperText: string }
  | { status: "error"; message: string };

function stepLabel(status: AnalyzeState["status"]) {
  if (status === "ingesting") return "Ingesting";
  if (status === "extracting") return "Extracting";
  if (status === "analyzing") return "Analyzing";
  if (status === "formatting") return "Formatting";
  return "Ready";
}

export function ResearchScanner() {
  const params = useSearchParams();
  const initialMode = (params.get("mode") as SourceMode | null) ?? "pdf";

  const [mode, setMode] = useState<SourceMode>(
    initialMode === "url" || initialMode === "text" ? initialMode : "pdf"
  );

  const [paperText, setPaperText] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState<string>(""); // comma-separated UI for now

  const [state, setState] = useState<AnalyzeState>({ status: "idle" });
  const [logging, setLogging] = useState(false);

  const derivedKeywords = useMemo(() => {
    const list = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 18);
    return list;
  }, [tags]);

  useEffect(() => {
    void fetch("/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "scanner",
        entity_id: "research-scanner",
        label: "Paper scanner",
        href: "/research/scanner",
      }),
    });
  }, []);

  async function runAnalyze() {
    // For URL mode, we allow empty excerpt and rely on server-side ingestion.
    // For PDF/Text, require text.
    if (mode !== "url" && !paperText.trim()) {
      toast.error("Add some paper text first.");
      return;
    }
    if (mode === "url" && !paperUrl.trim() && !paperText.trim()) {
      toast.error("Paste a URL (or add an excerpt).");
      return;
    }

    try {
      setState({ status: "ingesting", progress: 18 });
      await sleep(250);
      setState({ status: "extracting", progress: 34 });
      await sleep(250);
      setState({ status: "analyzing", progress: 62 });

      const res = await fetch("/api/papers/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_type: mode,
          source_url: mode === "url" && paperUrl ? paperUrl : null,
          paper_text: paperText,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let msg = errText || "Analyze failed";
        try {
          const j = JSON.parse(errText) as { userMessage?: string; error?: string };
          if (j.userMessage) msg = j.userMessage;
          else if (j.error) msg = j.error;
        } catch {
          /* keep raw */
        }
        throw new Error(msg);
      }

      setState({ status: "formatting", progress: 86 });
      const json = await res.json();
      const parsed = AnalyzeResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error("Unexpected analyze response shape.");
      }
      await sleep(180);
      const effectiveText =
        mode === "url"
          ? // When URL ingestion is successful server-side, the model will have analyzed ingested text.
            // Locally we store the user excerpt (if any) as the excerpt source.
            paperText
          : paperText;
      setState({ status: "done", data: parsed.data, paperText: effectiveText });

      // Auto-log to DB so we can open a dedicated results page by ID.
      setLogging(true);
      const a = parsed.data.analysis;
      const body = LogBodySchema.parse({
        paper_title: a.title || "Untitled paper",
        authors: a.authors || "",
        source_type: parsed.data.source_type,
        source_url: parsed.data.source_url,
        extracted_text_excerpt: effectiveText.slice(0, 1200),

        content_type: parsed.data.content_type ?? "research_paper",
        scan_meta: parsed.data.scan_meta ?? {},
        research_facets: parsed.data.research_facets ?? {},

        executive_summary: a.abstract_or_overview ?? "",
        methodology_summary: a.methodology ?? "",
        results_summary: a.results ?? "",
        discussion_summary: a.discussion ?? "",
        future_work_summary: a.future_work ?? "",

        key_takeaways: a.key_takeaways ?? [],
        keywords: (a.keywords?.length ? a.keywords : derivedKeywords) ?? [],
        important_concepts: a.important_concepts ?? [],

        user_notes: notes,
        reason_for_reading: reason,
        user_topic_tag: topic,

        processing_model: a.processing_model,
        processing_status: "completed",
        scan_confidence:
          a.confidence === "high"
            ? "high"
            : a.confidence === "medium"
              ? "medium"
              : a.confidence === "low"
                ? "low"
                : "very_low",
      });

      const logRes = await fetch("/api/papers/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!logRes.ok) throw new Error(await logRes.text());
      const logged = (await logRes.json()) as { paper_summary?: { id?: string } };
      const savedId = logged.paper_summary?.id;
      if (!savedId) throw new Error("Scan saved, but no id returned.");

      toast.success("Scan saved. Opening report…");
      window.location.href = `/research/results/${savedId}`;
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
      toast.error("Couldn’t complete scan.");
    } finally {
      setLogging(false);
    }
  }

  // Logging now happens automatically after scan success.

  const progress =
    state.status === "ingesting" ||
    state.status === "extracting" ||
    state.status === "analyzing" ||
    state.status === "formatting"
      ? state.progress
      : state.status === "done"
        ? 100
        : 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm text-foreground">
            <Sparkles className="size-4 text-muted-foreground" />
            Research Paper Scanner
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            One strong scan. Structured recall.
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
            Upload a PDF, paste a link, or drop raw text. Aroha Flow extracts what
            matters—method, results, discussion, and what to do next.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/research/archive" variant="secondary">
            Open archive
          </ButtonLink>
        </div>
      </div>

      <Card className="rounded-3xl border-border/80 bg-card/95 p-0 shadow-lg ring-1 ring-border/50 backdrop-blur-sm">
        <div className="grid max-h-[calc(100dvh-250px)] grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1fr_340px]">
          <div className="min-h-0 overflow-y-auto p-6 sm:p-8 lg:p-10">
            <Tabs value={mode} onValueChange={(v) => setMode(v as SourceMode)}>
              <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="size-4" /> PDF
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link2 className="size-4" /> Link
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <Type className="size-4" /> Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf" className="mt-4">
                <UploadZone
                  onTextReady={({ text }) => {
                    setPaperText(text);
                    toast.success("PDF text extracted. Ready to scan.");
                  }}
                />
                <div className="mt-4">
                  <Label className="text-muted-foreground">Paper text</Label>
                  <Textarea
                    value={paperText}
                    onChange={(e) => setPaperText(e.target.value)}
                    placeholder="Paste paper text here (abstract, methods, results, etc.)"
                    className="mt-2 min-h-44 bg-muted/55"
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-4">
                <Label className="text-muted-foreground">Paper URL</Label>
                <Input
                  value={paperUrl}
                  onChange={(e) => setPaperUrl(e.target.value)}
                  placeholder="https://arxiv.org/abs/..."
                  className="mt-2 bg-muted/55"
                />
                <div className="mt-4">
                  <Label className="text-muted-foreground">Optional excerpt</Label>
                  <Textarea
                    value={paperText}
                    onChange={(e) => setPaperText(e.target.value)}
                    placeholder="If the link isn’t accessible, paste the abstract/method/results you have."
                    className="mt-2 min-h-36 bg-muted/55"
                  />
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-4">
                <Label className="text-muted-foreground">Paper text</Label>
                <Textarea
                  value={paperText}
                  onChange={(e) => setPaperText(e.target.value)}
                  placeholder="Paste the full paper text or key sections."
                  className="mt-2 min-h-56 bg-muted/55"
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-h-0 overflow-y-auto border-t border-border/60 bg-muted/15 p-4 lg:border-l lg:border-t-0">
            <div className="sticky top-0 z-10 rounded-3xl border border-border bg-muted/50 p-4 backdrop-blur-sm">
              <div className="text-xs font-medium tracking-wide text-muted-foreground">
                Progress
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  {stepLabel(state.status)}
                </div>
                <div className="text-xs text-muted-foreground">{progress}%</div>
              </div>
              <Progress value={progress} className="mt-3" />
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={runAnalyze}
                  disabled={
                    state.status === "ingesting" ||
                    state.status === "extracting" ||
                    state.status === "analyzing" ||
                    state.status === "formatting"
                  }
                  className="w-full"
                >
                  {state.status === "ingesting" ||
                  state.status === "extracting" ||
                  state.status === "analyzing" ||
                  state.status === "formatting" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      Run scan
                    </>
                  )}
                </Button>
              </div>
              {state.status === "error" ? (
                <div className="mt-3 text-xs text-rose-200/90">
                  {state.message}
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-3xl border border-border bg-card/85 p-4">
              <div className="text-sm font-medium text-foreground">
                Before you log
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <Label className="text-muted-foreground">Why did I read this?</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2 min-h-20 bg-muted/55"
                    placeholder="Motivation, question, or intent."
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Topic / tag</Label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-2 bg-muted/55"
                    placeholder="e.g. RLHF, graph learning, systems"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Keywords (comma-separated)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="mt-2 bg-muted/55"
                    placeholder="retrieval, benchmark, causal inference"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">My notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 min-h-28 bg-muted/55"
                    placeholder="What stood out? What do you want to remember?"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {state.status === "done" ? (
        <Card className="rounded-3xl border-border bg-card/85 p-6 backdrop-blur">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Saving and opening your report…
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

