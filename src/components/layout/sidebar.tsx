import Link from "next/link";
import { BookOpen, Database, FolderKanban, Home, Settings2, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

const items: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subtle?: boolean;
}> = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/research/scanner", label: "Paper Scanner", icon: BookOpen },
  { href: "/research/archive", label: "Research Archive", icon: Database },
  { href: "/providers", label: "Providers", icon: Wrench, subtle: true },
  { href: "/settings", label: "Settings", icon: Settings2, subtle: true },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-[88px] rounded-3xl border border-border/70 bg-card/85 p-5 shadow-lg shadow-black/15 ring-1 ring-border/40 backdrop-blur-md">
        <div className="px-1 pb-3 pt-1 text-sm font-medium tracking-wide text-muted-foreground">
          Navigation
        </div>
        <nav className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-base text-muted-foreground transition hover:bg-muted/80 hover:text-foreground",
                  item.subtle && "text-muted-foreground/80 hover:text-foreground/95"
                )}
              >
                <Icon className="size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/40 p-5">
          <div className="text-base font-medium text-foreground">Room to grow</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This OS is modular—new tools can be added as independent modules
            without redesigning the whole app.
          </div>
        </div>
      </div>
    </aside>
  );
}

