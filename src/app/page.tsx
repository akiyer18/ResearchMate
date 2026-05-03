import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ModuleGrid } from "@/components/dashboard/module-grid";
import { pageVerticalPaddingClass } from "@/lib/page-shell";

export default function Home() {
  return (
    <div className={pageVerticalPaddingClass}>
      <div className="space-y-10 lg:space-y-12">
        <DashboardHero />
        <ModuleGrid />
      </div>
    </div>
  );
}
