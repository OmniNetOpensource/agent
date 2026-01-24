import type { Backend } from "@/src/features/chat/types/chat";
import type { IProvider } from "./types";
import { OpenRouterProvider } from "./openrouter";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

// Provider factory functions
type ProviderFactory = () => IProvider;

const providerFactories: Record<Backend, ProviderFactory> = {
  openrouter: () => new OpenRouterProvider(),
  anthropic: () => new AnthropicProvider(),
  openai: () => new OpenAIProvider(),
};

/**
 * Get a provider instance by backend name
 */
export function getProvider(backend: Backend): IProvider {
  const factory = providerFactories[backend];
  if (!factory) {
    throw new Error(`Unknown backend: ${backend}`);
  }
  return factory();
}

/**
 * Register a custom provider factory
 */
export function registerProvider(name: Backend, factory: ProviderFactory): void {
  providerFactories[name] = factory;
}

// Re-export types and utilities
export * from "./types";
export { StreamController } from "./stream-controller";
export { ResearchTracker } from "./research-tracker";
export { ToolExecutor } from "./tool-executor";
export { BaseProvider } from "./base-provider";
export { OpenRouterProvider } from "./openrouter";
export { AnthropicProvider } from "./anthropic";
export { OpenAIProvider } from "./openai";
