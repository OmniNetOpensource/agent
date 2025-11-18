import { NextResponse } from "next/server";
import OpenAI from "openai";
import { callToolByName, toolSpecs } from "@/lib/tools";

type RequestBody = {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

// Kimi K2 Thinking 配置
const KIMI_BASE_URL = "https://api.moonshot.cn/v1";
const KIMI_MODEL = "kimi-k2-thinking-turbo";

const encoder = new TextEncoder();

export async function POST(req: Request) {
  try {
    const { message, conversationHistory = [] } =
      (await req.json()) as RequestBody;

    if (typeof message !== "string") {
      return NextResponse.json({ reply: "Invalid message" }, { status: 400 });
    }

    const kimiApiKey = process.env.KIMI_API_KEY;
    if (!kimiApiKey) {
      return NextResponse.json(
        { reply: "Missing KIMI_API_KEY" },
        { status: 500 }
      );
    }

    const kimiClient = new OpenAI({
      apiKey: kimiApiKey,
      baseURL: KIMI_BASE_URL,
    });

    console.log(`[Chat-API] Using Kimi model: ${KIMI_MODEL}`);

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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
今天的日期是：${new Date().toISOString().slice(0, 10)}。

# 需要搜索的时候：非必要情况下不要用中文搜索；在没有足够上下文之前不要回答；如果没有搞清楚，就不断调研直到搞清楚，不要只是了解皮毛，要深入搜索资料去了解，要了解完全方位的资料搜寻才能开始回答。
# 什么时候不需要搜索：已知的知识

- 搜索工具使用技法：多次组合不同关键词进行多次搜索

- 获取更详细的信息：fetch特定网页

# 只有涉及到和真实网页交互时才能用到浏览器工具

`,
      },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: message,
      },
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const currentMessages = [...messages];
          const maxIterations = 20; // 防止无限循环
          let iteration = 0;

          while (iteration < maxIterations) {
            iteration++;
            console.log(
              `[Chat-API] Iteration ${iteration}, messages:`,
              currentMessages.length
            );

            const completion = (await kimiClient.chat.completions.create({
              model: KIMI_MODEL,
              messages: currentMessages,
              tools: tools.length > 0 ? tools : undefined,
              stream: true,
            })) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
            let assistantMessage = "";
            const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] =
              [];
            let currentToolCallIndex = -1;

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta;
              const finishReason = chunk.choices[0]?.finish_reason;

              // 处理思考过程
              // @ts-expect-error - reasoning_content 是 Kimi 特有的字段
              if (delta?.reasoning_content) {
                const data = {
                  type: "thinking",
                  // @ts-expect-error - reasoning_content 是 Kimi 特有的字段
                  content: delta.reasoning_content,
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
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
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

              // 检查是否完成
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
              tool_calls: toolCalls,
            });

            // 执行工具调用并添加工具结果
            console.log("[Chat-API] Executing", toolCalls.length, "tool calls");
            for (const toolCall of toolCalls) {
              if (toolCall.type !== "function") continue;

              const toolName = toolCall.function.name;
              const toolArgs = JSON.parse(toolCall.function.arguments);

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
                result: result.substring(0, 500), // 限制发送到客户端的长度
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(toolResultData)}\n\n`)
              );

              // 添加工具结果到消息历史
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
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
