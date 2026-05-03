"use client";

import { useCallback, useMemo, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { extractPdfText } from "@/services/pdf/extract-text";
import { Button } from "@/components/ui/button";

export function UploadZone({
  onTextReady,
  className,
}: {
  onTextReady: (result: { text: string; pages: number; fileName: string }) => void;
  className?: string;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const label = useMemo(() => {
    if (!busy) return "Drop a PDF here, or choose a file";
    if (!progress) return "Loading PDF…";
    return `Extracting text · Page ${progress.current}/${progress.total}`;
  }, [busy, progress]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file || file.type !== "application/pdf") return;
      setBusy(true);
      setProgress(null);
      try {
        const { text, pages } = await extractPdfText(file, (p) => {
          if (p.stage === "page" && p.current && p.total) {
            setProgress({ current: p.current, total: p.total });
          }
        });
        onTextReady({ text, pages, fileName: file.name });
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [onTextReady]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/80 bg-muted/40 p-6 transition",
        drag ? "bg-muted/60 border-border" : "",
        className
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await handleFile(file);
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-card/90 ring-1 ring-border/50">
            {busy ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <FileUp className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold text-foreground">PDF ingestion</div>
            <div className="mt-2 text-base leading-relaxed text-muted-foreground">{label}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/pdf";
              input.onchange = async () => {
                const file = input.files?.[0];
                if (file) await handleFile(file);
              };
              input.click();
            }}
          >
            Choose PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

