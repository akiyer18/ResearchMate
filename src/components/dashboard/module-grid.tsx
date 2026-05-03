"use client";

import { ModuleCard } from "@/components/dashboard/module-card";
import { MODULES } from "@/features/modules/registry";

export function ModuleGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
      {MODULES.map((m) => (
        <ModuleCard key={m.key} module={m} />
      ))}
    </div>
  );
}

