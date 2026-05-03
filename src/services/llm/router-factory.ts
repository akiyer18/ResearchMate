import { ProviderRouter } from "@/services/llm/provider-router";
import type { LLMProviderConfig, LLMProviderName } from "@/services/llm/types";
import type { LLMProvider } from "@/services/llm/provider";
import { OpenAIProvider } from "@/services/llm/providers/openai";
import { OpenRouterProvider } from "@/services/llm/providers/openrouter";
import { DisabledProvider } from "@/services/llm/providers/placeholders";

function env(name: string) {
  return process.env[name]?.trim();
}

export function buildDefaultProviderRouter() {
  const providers = new Map<LLMProviderName, LLMProvider>();

  const openaiKey = env("OPENAI_API_KEY");
  const openaiModel = env("OPENAI_MODEL") || "gpt-4.1-mini";

  providers.set(
    "openai",
    openaiKey ? new OpenAIProvider(openaiModel, openaiKey) : new DisabledProvider("openai", openaiModel)
  );

  const openrouterKey = env("OPENROUTER_API_KEY");
  const openrouterModel = env("OPENROUTER_MODEL") || "openai/gpt-4.1-mini";

  providers.set(
    "openrouter",
    openrouterKey ? new OpenRouterProvider(openrouterModel, openrouterKey) : new DisabledProvider("openrouter", openrouterModel)
  );

  // Placeholders for future adapters (enabled once implemented)
  providers.set("gemini", new DisabledProvider("gemini", env("GEMINI_MODEL") || "gemini-2.0-flash"));
  providers.set("groq", new DisabledProvider("groq", env("GROQ_MODEL") || "llama-3.1-70b-versatile"));
  providers.set("together", new DisabledProvider("together", env("TOGETHER_MODEL") || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"));
  providers.set("custom", new DisabledProvider("custom", env("CUSTOM_LLM_MODEL") || "custom"));

  const configs: LLMProviderConfig[] = [
    {
      name: "openai",
      enabled: Boolean(openaiKey),
      model: openaiModel,
      dailyRequestLimit: Number(env("OPENAI_DAILY_LIMIT") || 200),
      estimatedTokenLimit: Number(env("OPENAI_DAILY_TOKEN_LIMIT") || 2_000_000),
      priority: 1,
    },
    {
      name: "openrouter",
      enabled: Boolean(openrouterKey),
      model: openrouterModel,
      dailyRequestLimit: Number(env("OPENROUTER_DAILY_LIMIT") || 200),
      estimatedTokenLimit: Number(env("OPENROUTER_DAILY_TOKEN_LIMIT") || 2_000_000),
      priority: 2,
    },
    {
      name: "gemini",
      enabled: Boolean(env("GEMINI_API_KEY")),
      model: env("GEMINI_MODEL") || "gemini-2.0-flash",
      dailyRequestLimit: Number(env("GEMINI_DAILY_LIMIT") || 0),
      estimatedTokenLimit: Number(env("GEMINI_DAILY_TOKEN_LIMIT") || 0),
      priority: 3,
    },
    {
      name: "groq",
      enabled: Boolean(env("GROQ_API_KEY")),
      model: env("GROQ_MODEL") || "llama-3.1-70b-versatile",
      dailyRequestLimit: Number(env("GROQ_DAILY_LIMIT") || 0),
      estimatedTokenLimit: Number(env("GROQ_DAILY_TOKEN_LIMIT") || 0),
      priority: 4,
    },
    {
      name: "together",
      enabled: Boolean(env("TOGETHER_API_KEY")),
      model: env("TOGETHER_MODEL") || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      dailyRequestLimit: Number(env("TOGETHER_DAILY_LIMIT") || 0),
      estimatedTokenLimit: Number(env("TOGETHER_DAILY_TOKEN_LIMIT") || 0),
      priority: 5,
    },
    {
      name: "custom",
      enabled: Boolean(env("CUSTOM_LLM_API_KEY") && env("CUSTOM_LLM_BASE_URL")),
      model: env("CUSTOM_LLM_MODEL") || "custom",
      dailyRequestLimit: Number(env("CUSTOM_DAILY_LIMIT") || 0),
      estimatedTokenLimit: Number(env("CUSTOM_DAILY_TOKEN_LIMIT") || 0),
      priority: 6,
    },
  ];

  return new ProviderRouter(providers, configs);
}

