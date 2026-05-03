import { ResearchResultsPage } from "@/features/results/research-results-page";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className={pageVerticalPaddingClass}>
      <ResearchResultsPage
        id={id}
        backHref="/research/archive"
        backLabel="Back to archive"
      />
    </div>
  );
}

