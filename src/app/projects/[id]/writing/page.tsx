import { ProjectWorkspace } from "@/features/workspace/project-workspace";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default async function ProjectWritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className={pageVerticalPaddingClass}>
      <ProjectWorkspace projectId={id} activeTab="writing" />
    </div>
  );
}

