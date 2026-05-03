import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfTextFromBuffer(data: Buffer): Promise<{ text: string; pages: number }> {
  // Workerless mode to avoid bundler/worker issues in Next server runtime.
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await (pdfjs as any).getDocument({ data: uint8, disableWorker: true }).promise;
  const total = doc.numPages as number;
  const parts: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean)
      .join(" ");
    parts.push(pageText);
  }

  return { text: parts.join("\n\n").trim(), pages: total };
}

