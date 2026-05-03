import type { LLMProvider } from "@/services/llm/provider";
import { LLMProviderError } from "@/services/llm/provider";

/**
 * Placeholder adapters.
 *
 * Some providers do not expose perfect quota introspection. We therefore rely on:
 * - configured daily limits
 * - internal usage tracking
 * - retry/fallback to the next provider on failure
 */

export class DisabledProvider implements LLMProvider {
  constructor(
    public readonly name: LLMProvider["name"],
    public readonly model: string
  ) {}

  async chat(): Promise<never> {
    throw new LLMProviderError({
      provider: this.name,
      code: "provider_error",
      message: "Provider adapter not enabled/configured.",
    });
  }
}

