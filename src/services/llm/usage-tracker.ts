import { providerUsageRepo } from "@/services/repositories/provider-usage-repo";
import type { LLMProviderConfig, LLMProviderName } from "@/services/llm/types";

export type ProviderUsageSnapshot = {
  provider_name: LLMProviderName;
  usage_date: string;
  requests_count: number;
  estimated_tokens: number;
  success_count: number;
  failure_count: number;
};

export function todayYYYYMMDD() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsage(provider_name: LLMProviderName, usage_date = todayYYYYMMDD()) {
  const row = await providerUsageRepo.get(provider_name, usage_date);
  return (
    row ?? {
      id: "",
      provider_name,
      usage_date,
      requests_count: 0,
      estimated_tokens: 0,
      success_count: 0,
      failure_count: 0,
    }
  );
}

export async function recordAttempt(input: {
  provider_name: LLMProviderName;
  usage_date?: string;
  estimated_tokens?: number;
  ok: boolean;
}) {
  const usage_date = input.usage_date ?? todayYYYYMMDD();
  return providerUsageRepo.upsertDelta({
    provider_name: input.provider_name,
    usage_date,
    requests_delta: 1,
    tokens_delta: Math.max(0, input.estimated_tokens ?? 0),
    success_delta: input.ok ? 1 : 0,
    failure_delta: input.ok ? 0 : 1,
  });
}

export async function hasCapacity(config: LLMProviderConfig, usage_date = todayYYYYMMDD()) {
  const usage = await getUsage(config.name, usage_date);
  if (!config.enabled) return false;
  if (config.dailyRequestLimit > 0 && usage.requests_count >= config.dailyRequestLimit) return false;
  if (config.estimatedTokenLimit > 0 && usage.estimated_tokens >= config.estimatedTokenLimit) return false;
  return true;
}

