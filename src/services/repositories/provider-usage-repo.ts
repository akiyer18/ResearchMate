import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { providerUsageDaily } from "@/db/schema";
import type { ProviderUsageDailyRecord } from "@/types/papers";

function toRecord(row: typeof providerUsageDaily.$inferSelect): ProviderUsageDailyRecord {
  return {
    id: row.id,
    provider_name: row.providerName,
    usage_date: row.usageDate,
    requests_count: row.requestsCount,
    estimated_tokens: row.estimatedTokens,
    success_count: row.successCount,
    failure_count: row.failureCount,
  };
}

export const providerUsageRepo = {
  async get(provider_name: string, usage_date: string) {
    const row = await db.query.providerUsageDaily.findFirst({
      where: (t, { and, eq }) => and(eq(t.providerName, provider_name), eq(t.usageDate, usage_date)),
    });
    return row ? toRecord(row) : null;
  },

  async upsertDelta(input: {
    provider_name: string;
    usage_date: string;
    requests_delta: number;
    tokens_delta: number;
    success_delta: number;
    failure_delta: number;
  }) {
    const existing = await this.get(input.provider_name, input.usage_date);

    if (!existing) {
      const [row] = await db
        .insert(providerUsageDaily)
        .values({
          providerName: input.provider_name,
          usageDate: input.usage_date,
          requestsCount: Math.max(0, input.requests_delta),
          estimatedTokens: Math.max(0, input.tokens_delta),
          successCount: Math.max(0, input.success_delta),
          failureCount: Math.max(0, input.failure_delta),
        })
        .returning();
      return toRecord(row);
    }

    const [row] = await db
      .update(providerUsageDaily)
      .set({
        requestsCount: existing.requests_count + input.requests_delta,
        estimatedTokens: existing.estimated_tokens + input.tokens_delta,
        successCount: existing.success_count + input.success_delta,
        failureCount: existing.failure_count + input.failure_delta,
      })
      .where(
        and(
          eq(providerUsageDaily.providerName, input.provider_name),
          eq(providerUsageDaily.usageDate, input.usage_date)
        )
      )
      .returning();

    return toRecord(row);
  },

  async listToday(usage_date: string) {
    const rows = await db
      .select()
      .from(providerUsageDaily)
      .where(eq(providerUsageDaily.usageDate, usage_date));
    return rows.map(toRecord);
  },
};

