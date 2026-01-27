import { NextResponse } from "next/server";
import { toolSpecs } from "@/src/shared/lib/tools";
import { isSupportedChatModel } from "@/src/shared/lib/openrouter/server";
import type {
  ChatRequest,
  SelectedSearchTool,
} from "@/src/features/chat/types/chat";
import {
  ConversationLogger,
  createConversationLogger,
} from "@/src/shared/lib/conversation-logger";
import {
  getProvider,
  StreamController,
  ResearchTracker,
  ToolExecutor,
} from "@/src/shared/lib/providers";

const generateConversationId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export async function POST(req: Request) {
  let logger: ConversationLogger | null = null;

  try {
    const {
      conversationHistory,
      conversationId,
      model,
      provider: providerPreferences,
      selectedSearchTool,
      searchEnabled,
      systemInstruction,
      backend,
    } = (await req.json()) as ChatRequest & { searchEnabled?: boolean };

    const isValidSearchTool = (
      value: unknown
    ): value is SelectedSearchTool =>
      value === "none" ||
      value === "brave_search" ||
      value === "serp_search" ||
      value === "tavily_search";

    const resolvedSearchTool: SelectedSearchTool = isValidSearchTool(
      selectedSearchTool
    )
      ? selectedSearchTool
      : searchEnabled === true
        ? "brave_search"
        : "none";

    logger = createConversationLogger();

    logger?.log("FRONTEND", "Received chat request", {
      conversationId,
      model,
      selectedSearchTool: resolvedSearchTool,
      hasSystemInstruction: !!systemInstruction,
      messageCount: conversationHistory.length,
    });

    if (
      !Array.isArray(conversationHistory) ||
      conversationHistory.length === 0
    ) {
      return NextResponse.json(
        { reply: "Invalid conversation history" },
        { status: 400 }
      );
    }

    const latestUserMessage = [...conversationHistory]
      .reverse()
      .find((msg) => msg.role === "user");

    if (
      !latestUserMessage ||
      !Array.isArray(latestUserMessage.blocks) ||
      latestUserMessage.blocks.length === 0
    ) {
      return NextResponse.json(
        { reply: "Missing user message" },
        { status: 400 }
      );
    }

    if (!isSupportedChatModel(model)) {
      return NextResponse.json(
        { reply: "Invalid or missing model" },
        { status: 400 }
      );
    }

    const requestedModel = model;

    const allowedToolNames = new Set<string>(["fetch_url", "render_html"]);
    if (resolvedSearchTool !== "none") {
      allowedToolNames.add(resolvedSearchTool);
    }

    const tools = toolSpecs.filter(
      (tool) =>
        tool.type === "function" &&
        allowedToolNames.has(tool.function.name)
    );

    const searchToolAvailable =
      resolvedSearchTool !== "none" &&
      tools.some(
        (tool) =>
          tool.type === "function" &&
          tool.function.name === resolvedSearchTool
      );

    if (resolvedSearchTool !== "none" && !searchToolAvailable) {
      logger?.log("TOOLS", "Selected search tool not available", {
        selectedSearchTool: resolvedSearchTool,
      });
    }

    logger?.log(
      "TOOLS",
      `Tools loaded: ${tools.length}`,
      tools.map(
        (tool) =>
          (tool as { type: "function"; function: { name: string } }).function
            .name
      )
    );

    let activeConversationId = conversationId ?? null;
    let conversationCreatedEvent: {
      type: "conversation_created";
      conversationId: string;
      title: string;
      user_id: string;
      created_at: string;
      updated_at: string;
    } | null = null;

    if (!activeConversationId) {
      const newId = generateConversationId();
      activeConversationId = newId;
      const title = "New Chat";
      const now = new Date().toISOString();
      conversationCreatedEvent = {
        type: "conversation_created",
        conversationId: newId,
        title,
        user_id: "",
        created_at: now,
        updated_at: now,
      };
      logger?.log(
        "LOCAL",
        "Created local conversation",
        conversationCreatedEvent
      );
    }

    logger?.log("MODEL", "Using model", { model: requestedModel });

    // Get provider instance
    const provider = getProvider(backend ?? "openrouter");

    // Initialize provider
    provider.initialize(
      {
        model: requestedModel,
        tools,
        searchEnabled: searchToolAvailable,
        systemInstruction,
        provider: providerPreferences,
      },
      {
        conversationHistory: conversationHistory.map((message) => ({
          ...message,
          blocks: Array.isArray(message.blocks) ? message.blocks : [],
        })),
        conversationId: activeConversationId,
        logger,
        onProgress: () => {},
      }
    );

    const stream = new ReadableStream({
      async start(controller) {
        const streamController = new StreamController({ controller, logger });
        const researchTracker = new ResearchTracker();
        const toolExecutor = new ToolExecutor({
          logger,
          onEvent: (event) => {
            streamController.send(event);
            researchTracker.handle(event);
          },
        });

        // Send conversation created event if new
        if (conversationCreatedEvent) {
          streamController.send(conversationCreatedEvent);
        }

        const maxIterations = 20;
        let iteration = 0;

        try {
          while (iteration < maxIterations) {
            iteration++;
            logger?.log("ITERATION", `Starting iteration ${iteration}`);

            const generator = provider.runIteration();
            let result: { shouldContinue: boolean; pendingToolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>; assistantText: string };

            // Process stream events
            while (true) {
              const { done, value } = await generator.next();
              if (done) {
                result = value;
                break;
              }
              streamController.send(value);
              researchTracker.handle(value);
            }

            if (!result!.shouldContinue) {
              break;
            }

            // Send conversation updated event
            if (activeConversationId) {
              streamController.send({
                type: "conversation_updated",
                conversationId: activeConversationId,
                updated_at: new Date().toISOString(),
              });
            }

            // Execute tool calls
            logger?.log("TOOLS", `Executing ${result!.pendingToolCalls.length} tool calls`);
            const toolResults = await toolExecutor.execute(result!.pendingToolCalls);

            // Append tool results for next iteration
            provider.appendToolResults(toolResults);
          }

          if (iteration >= maxIterations && !streamController.isClosed()) {
            logger?.log("ITERATION", "Max iterations reached", { maxIterations, iteration });
            streamController.send({ type: "error", message: "[已达到最大工具调用次数限制]" });
          }

          // Send final conversation updated event
          if (activeConversationId && !streamController.isClosed()) {
            streamController.send({
              type: "conversation_updated",
              conversationId: activeConversationId,
              updated_at: new Date().toISOString(),
            });
          }

          streamController.close();
        } catch (error) {
          logger?.log("ERROR", "Stream processing error", {
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          });
          if (!streamController.isClosed()) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            try {
              streamController.send({ type: "error", message: `错误：${errorMessage}` });
            } catch (enqueueError) {
              logger?.log("ERROR", "Failed to enqueue error message", {
                error: enqueueError instanceof Error
                  ? { message: enqueueError.message, stack: enqueueError.stack }
                  : enqueueError,
              });
            }
            streamController.close();
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (logger) {
      logger.log("ERROR", "Top-level error", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
