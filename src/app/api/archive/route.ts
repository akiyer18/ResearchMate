import { NextResponse } from "next/server";

import { ArchiveQuerySchema } from "@/lib/archive-query";
import { paperRepo } from "@/services/repositories/paper-repo";

export async function GET(req: Request) {
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
  const items = await paperRepo.listArchive({
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

  return NextResponse.json({ items });
}

