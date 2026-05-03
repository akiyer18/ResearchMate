import { ResearchArchive } from "@/features/archive/research-archive";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default function ResearchArchivePage() {
  return (
    <div className={pageVerticalPaddingClass}>
      <ResearchArchive />
    </div>
  );
}

