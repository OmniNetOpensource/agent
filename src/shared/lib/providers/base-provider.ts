import type { Backend } from "@/src/features/chat/types/chat";
import type {
  IProvider,
  ProviderConfig,
  ProviderContext,
  ToolCallResult,
  StreamEvent,
  IterationResult,
} from "./types";

export abstract class BaseProvider implements IProvider {
  abstract readonly name: Backend;

  protected config!: ProviderConfig;
  protected context!: ProviderContext;
  protected initialized = false;

  initialize(config: ProviderConfig, context: ProviderContext): void {
    this.config = config;
    this.context = context;
    this.initialized = true;
    this.onInitialize();
  }

  // Hook for subclasses to perform additional initialization
  protected onInitialize(): void {}

  abstract runIteration(): AsyncGenerator<StreamEvent, IterationResult, undefined>;

  abstract appendToolResults(results: ToolCallResult[]): void;

  supportsModel(_model: string): boolean {
    // Default: support all models
    return true;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Provider ${this.name} not initialized. Call initialize() first.`);
    }
  }
}
