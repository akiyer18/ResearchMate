import { Suspense } from "react";
import { ResearchScanner } from "@/features/scanner/research-scanner";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default function ResearchScannerPage() {
  return (
    <div className={pageVerticalPaddingClass}>
      <Suspense fallback={null}>
        <ResearchScanner />
      </Suspense>
    </div>
  );
}

