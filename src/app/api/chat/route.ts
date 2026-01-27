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
  createEventSender,
  ResearchTracker,
  executeTools,
} from "@/src/shared/lib/providers";
import type { StreamEvent } from "@/src/shared/lib/providers";

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
    }

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
        const eventSender = createEventSender(controller, logger);
        const researchTracker = new ResearchTracker();
        const handleEvent = (event: StreamEvent) => {
          eventSender.send(event);
          researchTracker.handle(event);
        };

        // Send conversation created event if new
        if (conversationCreatedEvent) {
          eventSender.send(conversationCreatedEvent);
        }

        const maxIterations = 20;
        let iteration = 0;

        try {
          while (iteration < maxIterations) {
            iteration++;

            const generator = provider.runIteration();
            let result: { shouldContinue: boolean; pendingToolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>; assistantText: string };

            // Process stream events
            while (true) {
              const { done, value } = await generator.next();
              if (done) {
                result = value;
                break;
              }
              handleEvent(value);
            }

            if (!result!.shouldContinue) {
              break;
            }

            // Send conversation updated event
            if (activeConversationId) {
              eventSender.send({
                type: "conversation_updated",
                conversationId: activeConversationId,
                updated_at: new Date().toISOString(),
              });
            }

            // Execute tool calls
            const toolResults = await executeTools(result!.pendingToolCalls, {
              logger,
              onEvent: handleEvent,
            });

            // Append tool results for next iteration
            provider.appendToolResults(toolResults);
          }

          if (iteration >= maxIterations && !eventSender.isClosed()) {
            eventSender.send({ type: "error", message: "[已达到最大工具调用次数限制]" });
          }

          // Send final conversation updated event
          if (activeConversationId && !eventSender.isClosed()) {
            eventSender.send({
              type: "conversation_updated",
              conversationId: activeConversationId,
              updated_at: new Date().toISOString(),
            });
          }

          eventSender.close();
        } catch (error) {
          if (!eventSender.isClosed()) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            try {
              eventSender.send({ type: "error", message: `错误：${errorMessage}` });
            } catch (enqueueError) {
            }
            eventSender.close();
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
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
