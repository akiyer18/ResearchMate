import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { extractPdfTextFromBuffer } from "@/services/ingest/pdf";

export type UrlIngestionStatus = "ok" | "blocked" | "unreachable" | "empty" | "unsupported";

export type UrlIngestionResult = {
  success: boolean;
  status: UrlIngestionStatus;
  url: string;
  rawContentType: string | null;
  isPdf: boolean;
  title?: string;
  text: string;
  reason?: string;
  userMessage?: string;
};

const BLOCKED_MESSAGE =
  "This site could not be scraped due to access or security restrictions. Please paste the content manually.";

export async function ingestUrl(url: string): Promise<UrlIngestionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ArohaFlowResearchOS/1.0 (+local-dev) Mozilla/5.0",
        accept: "text/html,application/pdf;q=0.9,*/*;q=0.8",
      },
    });

    const contentType = res.headers.get("content-type");

    // Non-2xx: often blocked or requires auth.
    if (!res.ok) {
      const reason =
        res.status === 401 || res.status === 403
          ? "blocked_or_forbidden"
          : "http_error";
      const blocked =
        res.status === 401 || res.status === 403 || res.status === 429;

      return {
        success: false,
        status: blocked ? "blocked" : "unreachable",
        url,
        rawContentType: contentType,
        isPdf: Boolean(contentType?.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")),
        text: "",
        reason: `${reason}:${res.status}`,
        userMessage: blocked ? BLOCKED_MESSAGE : "We could not fetch this URL. Please check the link or paste the content manually.",
      };
    }

    const isPdf =
      Boolean(contentType?.includes("application/pdf")) ||
      url.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);
      const { text } = await extractPdfTextFromBuffer(buf);
      const trimmed = (text || "").trim();
      if (!trimmed) {
        return {
          success: false,
          status: "empty",
          url,
          rawContentType: contentType,
          isPdf: true,
          text: "",
          reason: "pdf_extracted_empty_text",
          userMessage:
            "We could not extract readable text from this PDF. Please download it and paste key sections manually.",
        };
      }
      return {
        success: true,
        status: "ok",
        url,
        rawContentType: contentType,
        isPdf: true,
        text: trimmed,
      };
    }

    // HTML / other text-like content.
    const html = await res.text();
    const lowerHtml = html.toLowerCase();

    // Heuristic for captcha / bot walls.
    const looksBlocked =
      lowerHtml.includes("captcha") ||
      lowerHtml.includes("cloudflare") ||
      lowerHtml.includes("access denied") ||
      lowerHtml.includes("are you a robot") ||
      lowerHtml.includes("bot detection");

    if (looksBlocked) {
      return {
        success: false,
        status: "blocked",
        url,
        rawContentType: contentType,
        isPdf: false,
        text: "",
        reason: "html_captcha_or_bot_block",
        userMessage: BLOCKED_MESSAGE,
      };
    }

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const reader = new Readability(doc);
    const article = reader.parse();

    const title =
      article?.title ||
      doc.querySelector("title")?.textContent?.trim() ||
      undefined;

    const text =
      (article?.textContent || "").trim() ||
      doc.body?.textContent?.replace(/\s+\n/g, "\n")?.trim() ||
      "";

    const trimmed = text.trim();

    if (!trimmed || trimmed.length < 400) {
      // Very low amount of text – treat as effectively empty/unsupported.
      return {
        success: false,
        status: "empty",
        url,
        rawContentType: contentType,
        isPdf: false,
        text: "",
        reason: "html_extracted_insufficient_text",
        userMessage:
          "We could not extract enough readable text from this page. Please paste the relevant content manually.",
      };
    }

    return {
      success: true,
      status: "ok",
      url,
      rawContentType: contentType,
      isPdf: false,
      title,
      text: trimmed,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out while fetching URL."
        : "Network error while fetching URL.";

    return {
      success: false,
      status: "unreachable",
      url,
      rawContentType: null,
      isPdf: url.toLowerCase().endsWith(".pdf"),
      text: "",
      reason: message,
      userMessage:
        "We could not reach this URL. Please check your connection or paste the content manually.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

