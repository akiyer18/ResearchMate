"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import type { AppModule } from "@/features/modules/registry";
import { cn } from "@/lib/utils";

const accentRing: Record<AppModule["accent"], string> = {
  indigo: "shadow-lg shadow-black/20 ring-1 ring-border/70",
  emerald: "shadow-lg shadow-black/20 ring-1 ring-border/70",
  fuchsia: "shadow-lg shadow-black/20 ring-1 ring-border/70",
  amber: "shadow-lg shadow-black/20 ring-1 ring-border/70",
  cyan: "shadow-lg shadow-black/20 ring-1 ring-border/70",
};

const accentGlow: Record<AppModule["accent"], string> = {
  indigo: "from-primary/15 to-accent/10",
  emerald: "from-emerald-600/12 to-teal-600/8",
  fuchsia: "from-stone-400/10 to-amber-900/8",
  amber: "from-amber-600/12 to-stone-500/8",
  cyan: "from-sky-600/10 to-slate-600/8",
};

export function ModuleCard({ module }: { module: AppModule }) {
  const Icon = module.icon;
  const isPlaceholder = module.status !== "ready";

  const content = (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-8 backdrop-blur-sm",
        accentRing[module.accent],
        isPlaceholder && "opacity-70"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50",
          accentGlow[module.accent]
        )}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-border/80 bg-muted/50">
            <Icon className="size-6 text-foreground/90" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3.5 py-1.5 text-sm text-muted-foreground">
            {isPlaceholder ? "Coming soon" : "Ready"}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xl font-semibold tracking-tight text-foreground">
            {module.title}
          </div>
          <div className="mt-3 text-base leading-relaxed text-muted-foreground">
            {module.description}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between text-base text-muted-foreground">
          <span className="font-medium">
            {isPlaceholder ? "Preview" : "Open module"}
          </span>
          <ArrowRight className="size-4 opacity-70 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.div>
  );

  if (isPlaceholder) return <div aria-disabled="true">{content}</div>;
  return (
    <Link href={module.href} className="block">
      {content}
    </Link>
  );
}

