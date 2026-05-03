import type { LLMProvider, LLMChatInput } from "@/services/llm/provider";
import { LLMProviderError } from "@/services/llm/provider";
import type { LLMChatResult } from "@/services/llm/types";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  usage?: { total_tokens?: number };
  error?: { message?: string; code?: string };
};

export class OpenRouterProvider implements LLMProvider {
  readonly name = "openrouter" as const;

  constructor(
    public readonly model: string,
    private readonly apiKey: string
  ) {}

  async chat(input: LLMChatInput): Promise<LLMChatResult> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: input.messages,
        temperature: 0.2,
      }),
    }).catch((e) => {
      throw new LLMProviderError({
        provider: this.name,
        code: "network_error",
        message: e instanceof Error ? e.message : "Network error",
      });
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = text || `OpenRouter HTTP ${res.status}`;
      const code =
        res.status === 401 || res.status === 403
          ? "invalid_auth"
          : res.status === 429
            ? "rate_limited"
            : "provider_error";
      throw new LLMProviderError({ provider: this.name, code, message: msg });
    }

    const json = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    const content = json.choices?.[0]?.message?.content ?? "";
    return {
      provider: this.name,
      model: json.model ?? this.model,
      outputText: content,
      estimatedTokens: json.usage?.total_tokens,
    };
  }
}

