import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { appShellContentClass } from "@/lib/page-shell";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground bg-[linear-gradient(165deg,oklch(0.28_0.02_78)_0%,oklch(0.245_0.022_76)_42%,oklch(0.22_0.024_74)_100%),radial-gradient(1200px_circle_at_12%_-8%,oklch(0.55_0.04_75_/_0.12),transparent_55%),radial-gradient(900px_circle_at_92%_8%,oklch(0.5_0.035_195_/_0.08),transparent_50%),radial-gradient(800px_circle_at_48%_108%,oklch(0.45_0.03_95_/_0.06),transparent_52%)]">
      <TopNav />
      <div className={appShellContentClass}>
        <Sidebar />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

