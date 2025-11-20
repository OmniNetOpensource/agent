import { NextResponse } from "next/server";
import { callToolByName, toolSpecs } from "@/lib/tools";
import type { OpenRouter } from "@openrouter/sdk";
import {
  DEFAULT_CHAT_MODEL_ID,
  isSupportedChatModel,
  type ChatModelId,
} from "@/lib/models";
import { getOpenRouterClient, getOpenRouterHeaders } from "@/lib/openrouter";
type RequestBody = {
  contentParts: unknown[];
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string | unknown;
  }>;
  model?: ChatModelId;
};

type StreamToolCall = {
  index?: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      toolCalls?: StreamToolCall[];
    };
    finishReason?: string | null;
  }>;
};

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  toolCalls?: StreamToolCall[];
  toolCallId?: string;
  name?: string;
};

const DEFAULT_MODEL = DEFAULT_CHAT_MODEL_ID;

const encoder = new TextEncoder();

export async function POST(req: Request) {
  try {
    const {
      contentParts,
      conversationHistory = [],
      model,
    } = (await req.json()) as RequestBody;

    if (!Array.isArray(contentParts) || contentParts.length === 0) {
      return NextResponse.json({ reply: "Invalid message" }, { status: 400 });
    }

    const requestedModel = isSupportedChatModel(model) ? model : DEFAULT_MODEL;

    let openRouterClient: OpenRouter;
    try {
      openRouterClient = getOpenRouterClient();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Missing OPENROUTER_API_KEY";
      return NextResponse.json({ reply: message }, { status: 500 });
    }

    console.log(`[Chat-API] Using model: ${requestedModel}`);

    const tools = toolSpecs;
    console.log(
      "[Chat-API] Tools loaded:",
      tools.length,
      tools
        .map(
          (tool) =>
            (tool as { type: "function"; function: { name: string } }).function
              .name
        )
        .join(", ")
    );

    const userContent = contentParts as unknown;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `
今天的日期是：${new Date().toISOString().slice(0, 10)}

# 需要搜索的时候：非必要情况下不要用中文搜索；在没有足够上下文之前不要回答；如果没有搞清楚，就不断调研直到搞清楚，不要只是了解皮毛，要深入搜索资料去了解，要了解全方位的资料搜寻才能开始回答。

# 什么时候不需要搜索：已知的知识

- 搜索工具使用技法：多次组合不同关键词进行多次搜索
- 获取更详细的信息：fetch 特定网页
`,
      },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : String(msg.content ?? ""),
      })),
      {
        role: "user",
        content: userContent,
      },
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const currentMessages: ChatMessage[] = [...messages];
          const maxIterations = 20; // 防止无限循环
          let iteration = 0;

          while (iteration < maxIterations) {
            iteration++;
            console.log(
              `[Chat-API] Iteration ${iteration}, messages:`,
              currentMessages.length
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completion = await (openRouterClient.chat as any).send(
              {
                model: requestedModel,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
              },
              {
                headers: getOpenRouterHeaders(),
              }
            );
            let assistantMessage = "";
            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> = [];
            let currentToolCallIndex = -1;

            for await (const chunk of completion as AsyncIterable<StreamChunk>) {
              const delta = chunk?.choices?.[0]?.delta;
              const finishReason = chunk?.choices?.[0]?.finishReason as
                | string
                | undefined;

              // 处理思考过程（OpenRouter SDK 使用 reasoning 字段）
              if (delta?.reasoning) {
                const data = {
                  type: "thinking",
                  content: delta.reasoning,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }

              // 处理普通内容
              if (delta?.content) {
                assistantMessage += delta.content;
                const data = {
                  type: "content",
                  content: delta.content,
                };
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
              }

              // 处理工具调用
              if (delta?.toolCalls) {
                for (const toolCall of delta.toolCalls as StreamToolCall[]) {
                  if (
                    toolCall.index !== undefined &&
                    toolCall.index !== currentToolCallIndex
                  ) {
                    currentToolCallIndex = toolCall.index;
                    toolCalls[currentToolCallIndex] = {
                      id: toolCall.id || "",
                      type: "function",
                      function: {
                        name: toolCall.function?.name || "",
                        arguments: toolCall.function?.arguments || "",
                      },
                    };
                  } else if (
                    currentToolCallIndex >= 0 &&
                    toolCall.function?.arguments
                  ) {
                    // 追加参数
                    const currentToolCall = toolCalls[currentToolCallIndex];
                    if (
                      currentToolCall &&
                      currentToolCall.type === "function"
                    ) {
                      currentToolCall.function.arguments +=
                        toolCall.function.arguments;
                    }
                  }
                }
              }

              // 检查是否完结
              if (finishReason === "stop") {
                console.log("[Chat-API] Stream finished with stop");
                controller.close();
                return;
              }

              if (finishReason === "tool_calls" && toolCalls.length > 0) {
                console.log(
                  "[Chat-API] Stream finished with tool_calls:",
                  toolCalls.length
                );
                break;
              }
            }

            // 如果没有工具调用，结束循环
            if (toolCalls.length === 0) {
              console.log("[Chat-API] No tool calls, ending");
              controller.close();
              return;
            }

            // 添加助手消息（包含工具调用）
            currentMessages.push({
              role: "assistant",
              content: assistantMessage || null,
              toolCalls,
            });

            // 执行工具调用并添加工具结果
            console.log("[Chat-API] Executing", toolCalls.length, "tool calls");
            for (const toolCall of toolCalls) {
              if (toolCall.type !== "function") continue;

              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

              console.log(
                "[Chat-API] Calling tool:",
                toolName,
                "with args:",
                toolArgs
              );

              // 向客户端发送工具调用信息
              const toolCallData = {
                type: "tool_call",
                tool: toolName,
                args: toolArgs,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(toolCallData)}\n\n`)
              );

              // 调用工具
              const result = await callToolByName(toolName, toolArgs);

              // 向客户端发送工具结果
              const toolResultData = {
                type: "tool_result",
                tool: toolName,
                result: result,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(toolResultData)}\n\n`)
              );

              // 添加工具结果到消息历史
              currentMessages.push({
                role: "tool",
                toolCallId: toolCall.id,
                content: result,
              });
            }

            // 继续下一轮对话（让模型基于工具结果生成回答）
          }

          if (iteration >= maxIterations) {
            console.log("[Chat-API] Max iterations reached");
            const data = {
              type: "content",
              content: "\n\n[已达到最大工具调用次数限制]",
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          console.error("[Chat-API] Error:", error);
          controller.error(error);
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
    console.error("[Chat-API] Top-level error:", error);
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
