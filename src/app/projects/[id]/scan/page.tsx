import { ProjectScan } from "@/features/workspace/project-scan";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default async function ProjectScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className={pageVerticalPaddingClass}>
      <ProjectScan projectId={id} />
    </div>
  );
}

