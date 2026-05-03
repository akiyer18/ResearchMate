import type { ChatMessage, LLMChatResult, LLMProviderName } from "@/services/llm/types";

export type LLMChatInput = {
  messages: ChatMessage[];
  // Best-effort hint; used for internal token estimation/limits.
  estimatedTokens?: number;
};

export class LLMProviderError extends Error {
  readonly provider: LLMProviderName;
  readonly code:
    | "rate_limited"
    | "quota_exceeded"
    | "invalid_auth"
    | "bad_request"
    | "provider_error"
    | "network_error";

  constructor(input: { provider: LLMProviderName; code: LLMProviderError["code"]; message: string }) {
    super(input.message);
    this.provider = input.provider;
    this.code = input.code;
  }
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  chat(input: LLMChatInput): Promise<LLMChatResult>;
}

