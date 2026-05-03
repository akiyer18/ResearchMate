import { ProjectsIndex } from "@/features/projects/projects-index";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default function ProjectsPage() {
  return (
    <div className={pageVerticalPaddingClass}>
      <ProjectsIndex />
    </div>
  );
}

