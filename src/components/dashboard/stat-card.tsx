import { cn } from "@/lib/utils";

const accentStyles: Record<string, string> = {
  indigo:
    "bg-[radial-gradient(500px_circle_at_20%_0%,oklch(0.5_0.04_260_/_0.12),transparent_60%)]",
  emerald:
    "bg-[radial-gradient(500px_circle_at_20%_0%,oklch(0.52_0.05_155_/_0.1),transparent_60%)]",
  fuchsia:
    "bg-[radial-gradient(500px_circle_at_20%_0%,oklch(0.52_0.045_310_/_0.1),transparent_60%)]",
  amber:
    "bg-[radial-gradient(500px_circle_at_20%_0%,oklch(0.58_0.06_75_/_0.11),transparent_60%)]",
  cyan:
    "bg-[radial-gradient(500px_circle_at_20%_0%,oklch(0.52_0.045_210_/_0.1),transparent_60%)]",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "indigo",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: keyof typeof accentStyles;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/90 px-6 py-5 shadow-md ring-1 ring-border/40">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          accentStyles[accent]
        )}
      />
      <div className="relative">
        <div className="text-sm font-medium tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {hint ? (
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

