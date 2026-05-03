export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMProviderName =
  | "openai"
  | "openrouter"
  | "gemini"
  | "groq"
  | "together"
  | "custom";

export type LLMProviderConfig = {
  name: LLMProviderName;
  enabled: boolean;
  model: string;
  dailyRequestLimit: number;
  estimatedTokenLimit: number;
  priority: number;
};

export type LLMChatResult = {
  provider: LLMProviderName;
  model: string;
  outputText: string;
  estimatedTokens?: number;
};

