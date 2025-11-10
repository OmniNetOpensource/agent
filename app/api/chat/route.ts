import { NextResponse } from "next/server";
import OpenAI from "openai";
import { mcpClient } from "@/lib/mcp-client";

type RequestBody = {
  message: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

// 扩展 OpenAI 类型以支持 Gemini 特定参数
type GeminiChatCompletionCreateParams = OpenAI.ChatCompletionCreateParams & {
  extra_body?: {
    google?: {
      thinking_config?: {
        thinking_budget?: number;
        include_thoughts?: boolean;
      };
    };
  };
};

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = "gemini-2.5-flash";

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const geminiClient = new OpenAI({
      apiKey,
      baseURL: GEMINI_BASE_URL,
    });

    // Kimi K2 Thinking client
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

    // 初始化 MCP 客户端并获取工具
    console.log("[Chat-API] Initializing MCP client...");
    await mcpClient.initialize();
    const tools = await mcpClient.getTools();
    console.log("[Chat-API] MCP tools loaded:", tools.length);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
你是一个智能助手，拥有多种工具能力。

可用工具：
- echo: 回显文本
- read_file: 读取项目文件
- fetch_url: 获取网页内容并转为 markdown
- brave_search: 使用 Brave 搜索网络（如果配置了 API 密钥）
- browser_screenshot: 使用真实浏览器截图
- browser_extract: 使用真实浏览器提取网页内容
- browser_interact: 与网页进行交互（点击、填表等）

当用户需要获取实时信息、读取文件、访问网页时，请主动使用相应的工具。

回答风格：
请用朴实、平静、耐心的语言回答我的问题，就像一个有经验的朋友在认真地帮我理解一个话题。语气要温和、鼓励，让人感到你愿意花时间把事情讲清楚。不要使用夸张的形容词和营销式的表达，比如"非常棒"、"超级强大"这类词，而是具体说明实际情况就好。

回答时请关注底层原理和运作机制，不只是停留在表面现象。重点说明"为什么"和"怎么做到的"，而不只是"是什么"。涉及具体机制时，说明内部是如何运作的、各个环节如何衔接、过程中发生了什么变化。

在解释复杂概念时，请从最基础的部分讲起，一步步引导到深层内容。如果某个概念需要先理解一些背景知识或相关话题，可以稍微展开解释一下，帮助建立完整认知框架，确保理解的连贯性。把整个话题拆分成容易消化的小步骤，让人能跟上思路。

请主动预见可能产生歧义或困惑的地方，在讲到这些点时停下来做个说明。比如某个术语有多种含义，或者某个步骤容易被误解，就提前澄清。用具体例子和场景来说明抽象概念，指出新手常见的误区和容易忽略的细节。可以适当使用类比，但要确保类比准确，不要为了简化而丢失关键信息。

默认使用完整句子与成段表述；搜索用英文，回答用中文`,
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
          const maxIterations = 10; // 防止无限循环
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
            1;
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

              // 调用 MCP 工具
              const result = await mcpClient.callTool(toolName, toolArgs);

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
