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

// Gemini Configuration
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = "gemini-2.5-flash";

const encoder = new TextEncoder();

// 初始化 MCP 客户端
let mcpInitialized = false;
async function ensureMCPInitialized() {
  if (!mcpInitialized) {
    await mcpClient.initialize();
    mcpInitialized = true;
  }
}

export async function POST(req: Request) {
  try {
    const { message, conversationHistory = [] } = (await req.json()) as RequestBody;

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

    // 初始化 MCP 客户端
    await ensureMCPInitialized();

    const client = new OpenAI({
      apiKey,
      baseURL: GEMINI_BASE_URL,
    });

    // 获取 MCP 工具
    const tools = await mcpClient.getTools();

    // 构建消息历史
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a helpful assistant with access to tools. Use them when needed.",
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

    // 调用 AI，支持工具
    let completion = await client.chat.completions.create({
      model: GEMINI_MODEL,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      stream: false, // 先不使用流式，方便处理工具调用
      reasoning_effort: "high",
    });

    let response = completion.choices[0].message;

    // 处理工具调用
    const maxIterations = 5; // 防止无限循环
    let iteration = 0;

    while (response.tool_calls && response.tool_calls.length > 0 && iteration < maxIterations) {
      iteration++;

      // 将 AI 的工具调用添加到消息历史
      messages.push(response);

      // 执行所有工具调用
      for (const toolCall of response.tool_calls) {
        // 类型守卫：确保是函数调用
        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.error(`Calling tool: ${toolName}`, toolArgs);

        // 调用 MCP 工具
        const toolResult = await mcpClient.callTool(toolName, toolArgs);

        // 将工具结果添加到消息历史
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // 继续对话，让 AI 处理工具结果
      completion = await client.chat.completions.create({
        model: GEMINI_MODEL,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        stream: false,
        reasoning_effort: "high",
      });

      response = completion.choices[0].message;
    }

    // 返回最终响应（流式）
    const finalContent = response.content || "I apologize, but I couldn't generate a response.";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(finalContent));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { reply: "Unable to process request" },
      { status: 500 }
    );
  }
}
