import type { LLMProvider } from "@/services/llm/provider";
import type { LLMChatResult, LLMProviderConfig, LLMProviderName } from "@/services/llm/types";
import { LLMProviderError } from "@/services/llm/provider";
import { hasCapacity, recordAttempt } from "@/services/llm/usage-tracker";

export type RouterDecision = {
  chosen: LLMProviderName | "none";
  tried: LLMProviderName[];
  errors: Array<{ provider: LLMProviderName; code: string; message: string }>;
};

export class ProviderRouter {
  constructor(
    private readonly providers: Map<LLMProviderName, LLMProvider>,
    private readonly configs: LLMProviderConfig[]
  ) {}

  async chat(input: {
    messages: Parameters<LLMProvider["chat"]>[0]["messages"];
    estimatedTokens?: number;
  }): Promise<{ result: LLMChatResult; decision: RouterDecision }> {
    const enabled = [...this.configs]
      .filter((c) => c.enabled)
      .sort((a, b) => a.priority - b.priority);

    const decision: RouterDecision = { chosen: "none", tried: [], errors: [] };

    for (const cfg of enabled) {
      const provider = this.providers.get(cfg.name);
      if (!provider) continue;

      const okCapacity = await hasCapacity(cfg);
      if (!okCapacity) continue;

      decision.tried.push(cfg.name);

      try {
        const result = await provider.chat({
          messages: input.messages,
          estimatedTokens: input.estimatedTokens,
        });
        await recordAttempt({
          provider_name: cfg.name,
          estimated_tokens: result.estimatedTokens ?? input.estimatedTokens,
          ok: true,
        });
        decision.chosen = cfg.name;
        return { result, decision };
      } catch (err) {
        const e =
          err instanceof LLMProviderError
            ? err
            : new LLMProviderError({
                provider: cfg.name,
                code: "provider_error",
                message: err instanceof Error ? err.message : "Unknown provider error",
              });

        await recordAttempt({
          provider_name: cfg.name,
          estimated_tokens: input.estimatedTokens,
          ok: false,
        });
        decision.errors.push({ provider: cfg.name, code: e.code, message: e.message });

        // Fallback on common transient/quota errors.
        if (e.code === "rate_limited" || e.code === "quota_exceeded" || e.code === "provider_error") {
          continue;
        }

        // For auth/bad request errors, also continue; configuration may be partial.
        continue;
      }
    }

    const tried = decision.tried.join(", ") || "(none)";
    const details = decision.errors.length
      ? `\n\nProvider errors:\n${decision.errors
          .map((e) => `- ${e.provider} (${e.code}): ${e.message}`)
          .join("\n")}`
      : "";

    throw new Error(`No LLM providers available. Tried: ${tried}${details}`);
  }
}

