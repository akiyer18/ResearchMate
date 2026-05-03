import { NextResponse } from "next/server";

import { ArchiveQuerySchema } from "@/lib/archive-query";
import { collectionsRepo } from "@/services/repositories/collections-repo";
import { paperRepo } from "@/services/repositories/paper-repo";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const query = ArchiveQuerySchema.safeParse(raw);
  if (!query.success) {
    return NextResponse.json(
      { error: "Invalid query", details: query.error.flatten() },
      { status: 400 }
    );
  }
  const d = query.data;
  try {
    const items = await paperRepo.listByProject(id, 200, {
      q: d.q,
      sourceType: d.sourceType,
      topic: d.topic,
      keyword: d.keyword,
      fromDate: d.fromDate,
      toDate: d.toDate,
      methods: d.methods,
      datasets: d.datasets,
      performanceLevels: d.performanceLevels?.length ? d.performanceLevels : undefined,
      confidenceLevels: d.confidenceLevels?.length ? d.confidenceLevels : undefined,
      sort: d.sort,
      limit: d.limit,
      offset: d.offset,
    });
    const assignMap = await collectionsRepo.listAssignmentsForProject(id);
    return NextResponse.json({
      items: items.map((p) => ({
        ...p,
        collection_ids: assignMap.get(p.id) ?? [],
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column")) {
      return NextResponse.json(
        {
          error: "database_schema_outdated",
          userMessage:
            "Your SQLite file is missing columns expected by the app. Run: npm run db:migrate",
        },
        { status: 503 }
      );
    }
    console.error("[GET /api/projects/[id]/papers]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

