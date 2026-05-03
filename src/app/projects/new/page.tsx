import { NewProject } from "@/features/projects/new-project";
import { cn } from "@/lib/utils";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default function NewProjectPage() {
  return (
    <div className={cn(pageVerticalPaddingClass, "mx-auto max-w-3xl lg:max-w-[52rem]")}>
      <NewProject />
    </div>
  );
}

