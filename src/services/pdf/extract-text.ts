"use client";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

type ProgressCb = (p: { stage: "loading" | "page"; current?: number; total?: number }) => void;

let workerConfigured = false;

function ensureWorker() {
  if (workerConfigured) return;
  // Turbopack + PDF.js can still attempt to create a worker even when disableWorker is set.
  // Providing an explicit workerSrc avoids runtime errors.
  (pdfjs as any).GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  workerConfigured = true;
}

export async function extractPdfText(file: File, onProgress?: ProgressCb) {
  ensureWorker();
  onProgress?.({ stage: "loading" });
  const data = await file.arrayBuffer();
  // Workerless mode avoids cross-origin / bundler worker issues in dev.
  const loadingTask = (pdfjs as any).getDocument({ data, disableWorker: true });
  const doc = await loadingTask.promise;

  const total = doc.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.({ stage: "page", current: i, total });
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean)
      .join(" ");
    parts.push(pageText);
  }

  const text = parts.join("\n\n");
  return { text, pages: total };
}

