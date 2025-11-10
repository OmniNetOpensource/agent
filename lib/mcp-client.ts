import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import OpenAI from "openai";

/**
 * MCP 客户端单例
 * 管理与 MCP 服务器的连接和工具调用
 */
class MCPClient {
  private client: Client | null = null;
  private server: McpServer | null = null;
  private initialized = false;
  /**
   * 初始化 MCP 客户端和服务器
   */
  async initialize() {
    if (this.initialized) {
      console.error("[MCP-Client] Already initialized, skipping");
      return;
    }

    console.error("[MCP-Client] Initializing MCP client and server...");

    // 创建 MCP 服务器
    console.error("[MCP-Client] Creating MCP server");
    this.server = new McpServer({
      name: "agent-mcp",
      version: "0.1.0",
      capabilities: {
        tools: {},
      },
    });

    // 注册工具
    console.error("[MCP-Client] Registering tools...");
    this.registerTools();

    // 创建客户端和服务器传输
    console.error("[MCP-Client] Creating in-memory transport pair");
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    // 创建客户端
    console.error("[MCP-Client] Creating client");
    this.client = new Client(
      {
        name: "agent-client",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    );

    // 连接服务器和客户端
    console.error("[MCP-Client] Connecting server and client...");
    await this.server.connect(serverTransport);
    await this.client.connect(clientTransport);

    this.initialized = true;
    console.error("[MCP-Client] ✅ Initialization complete");
  }

  /**
   * 检查工具是否被禁用
   */
  private isToolDisabled(toolName: string): boolean {
    const envKey = `MCP_DISABLE_${toolName.toUpperCase()}`;
    return process.env[envKey] === "true";
  }

  /**
   * 获取 LLM 客户端实例（根据环境变量配置）
   */
  private getLLMClient(): OpenAI {
    const llmProvider =
      process.env.LLM_PROVIDER?.trim().toLowerCase() || "kimi";

    if (llmProvider === "gemini") {
      return new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      });
    } else if (llmProvider === "openrouter") {
      return new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
    } else {
      return new OpenAI({
        apiKey: process.env.KIMI_API_KEY,
        baseURL: "https://api.moonshot.cn/v1",
      });
    }
  }

  /**
   * 获取 LLM 模型名称
   */
  private getLLMModel(): string {
    const llmProvider =
      process.env.LLM_PROVIDER?.trim().toLowerCase() || "kimi";

    if (llmProvider === "gemini") {
      return "gemini-2.5-flash";
    } else if (llmProvider === "openrouter") {
      return "openrouter/polaris-alpha";
    } else {
      return "kimi-k2-thinking-turbo";
    }
  }

  /**
   * 注册所有 MCP 工具
   */
  private registerTools() {
    if (!this.server) throw new Error("Server not initialized");

    const toolNames: string[] = [];

    // 工具：fetch_url
    if (this.isToolDisabled("fetch_url")) {
      console.error(
        "[MCP-Client] Skipping tool: fetch_url (disabled via MCP_DISABLE_FETCH_URL)"
      );
    } else {
      // 工具：fetch_url
      console.error("[MCP-Client] Registering tool: fetch_url");
      toolNames.push("fetch_url");
      this.server.registerTool(
        "fetch_url",
        {
          description:
            "Fetch more detailed content from a URL and convert it to markdown. Useful for reading web pages, documentation, or API responses.",
          inputSchema: {
            url: z.string().url().describe("The URL to fetch"),
          },
        },
        async ({ url }) => {
          console.error("[MCP-Tool:fetch_url] Fetching URL:", url);
          try {
            const response = await fetch(url);

            if (!response.ok) {
              console.error(
                "[MCP-Tool:fetch_url] ❌ HTTP error:",
                response.status,
                response.statusText
              );
              return {
                content: [
                  {
                    type: "text",
                    text: `Error: HTTP ${response.status} ${response.statusText}`,
                  },
                ],
                isError: true,
              };
            }

            const contentType = response.headers.get("content-type");
            console.error("[MCP-Tool:fetch_url] Content-Type:", contentType);

            // 处理 JSON 响应
            if (contentType?.includes("application/json")) {
              const json = await response.json();
              console.error("[MCP-Tool:fetch_url] ✅ Fetched JSON response");
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(json, null, 2),
                  },
                ],
              };
            }

            // 处理 HTML/文本响应
            const text = await response.text();
            console.error(
              "[MCP-Tool:fetch_url] ✅ Fetched text/HTML, original size:",
              text.length,
              "bytes"
            );

            // 简单的 HTML 转文本（移除标签）
            const cleanText = text
              .replace(
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                ""
              )
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            console.error(
              "[MCP-Tool:fetch_url] Cleaned text size:",
              cleanText.length,
              "bytes (truncated to 10000)"
            );
            return {
              content: [
                {
                  type: "text",
                  text: cleanText.substring(0, 10000), // 限制长度
                },
              ],
            };
          } catch (error) {
            console.error(
              "[MCP-Tool:fetch_url] ❌ Error:",
              (error as Error).message
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching URL: ${(error as Error).message}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    }

    // 工具：brave_search（可选，需要 BRAVE_API_KEY）
    if (this.isToolDisabled("brave_search")) {
      console.error(
        "[MCP-Client] Skipping tool: brave_search (disabled via MCP_DISABLE_BRAVE_SEARCH)"
      );
    } else if (process.env.BRAVE_API_KEY) {
      console.error(
        "[MCP-Client] Registering tool: brave_search (API key found)"
      );
      toolNames.push("brave_search");
      this.server.registerTool(
        "brave_search",
        {
          description:
            "Search the web using Brave Search API. Get real-time, up-to-date information from the internet. Supports web search, news, and image results.",
          inputSchema: {
            query: z.string().describe("The search query"),
            count: z
              .number()
              .optional()
              .describe("Number of results to return (default: 10, max: 20)"),
            freshness: z
              .enum(["pd", "pw", "pm", "py"])
              .optional()
              .describe(
                "Time filter: pd=past day, pw=past week, pm=past month, py=past year"
              ),
          },
        },
        async ({ query, count = 10, freshness }) => {
          console.error(
            "[MCP-Tool:brave_search] Searching for:",
            query,
            "| count:",
            count,
            "| freshness:",
            freshness || "none"
          );
          try {
            const params = new URLSearchParams({
              q: query,
              count: Math.min(count, 20).toString(),
            });

            if (freshness) {
              params.append("freshness", freshness);
            }

            const response = await fetch(
              `https://api.search.brave.com/res/v1/web/search?${params}`,
              {
                headers: {
                  Accept: "application/json",
                  "Accept-Encoding": "gzip",
                  "X-Subscription-Token": process.env.BRAVE_API_KEY!,
                },
              }
            );

            if (!response.ok) {
              console.error(
                "[MCP-Tool:brave_search] ❌ API error:",
                response.status,
                response.statusText
              );
              return {
                content: [
                  {
                    type: "text",
                    text: `Brave Search API error: ${response.status} ${response.statusText}`,
                  },
                ],
                isError: true,
              };
            }

            const data = await response.json();
            console.error(
              "[MCP-Tool:brave_search] ✅ Got results, web:",
              data.web?.results?.length || 0,
              "| news:",
              data.news?.results?.length || 0
            );

            // 格式化搜索结果
            let resultText = `Search results for: "${query}"\n\n`;

            if (data.web?.results && data.web.results.length > 0) {
              resultText += "Web Results:\n\n";
              data.web.results.forEach(
                (
                  result: { title: string; url: string; description?: string },
                  index: number
                ) => {
                  resultText += `${index + 1}. ${result.title}\n`;
                  resultText += `   URL: ${result.url}\n`;
                  resultText += `   ${
                    result.description || "No description"
                  }\n\n`;
                }
              );
            }

            // 添加新闻结果（如果有）
            if (data.news?.results && data.news.results.length > 0) {
              resultText += "\nNews Results:\n\n";
              data.news.results
                .slice(0, 3)
                .forEach(
                  (
                    result: {
                      title: string;
                      source?: string;
                      description?: string;
                    },
                    index: number
                  ) => {
                    resultText += `${index + 1}. ${result.title}\n`;
                    resultText += `   Source: ${result.source || "Unknown"}\n`;
                    resultText += `   ${result.description || ""}\n\n`;
                  }
                );
            }

            if (!data.web?.results || data.web.results.length === 0) {
              resultText = `No results found for "${query}"`;
            }

            return {
              content: [
                {
                  type: "text",
                  text: resultText,
                },
              ],
            };
          } catch (error) {
            console.error(
              "[MCP-Tool:brave_search] ❌ Error:",
              (error as Error).message
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Brave Search error: ${(error as Error).message}`,
                },
              ],
              isError: true,
            };
          }
        }
      );
    } else {
      console.error("[MCP-Client] Skipping brave_search (no BRAVE_API_KEY)");
    }

    console.error(
      "[MCP-Client] ✅ Registered",
      toolNames.length,
      "tools:",
      toolNames.join(", ")
    );
  }

  /**
   * 获取所有可用的工具列表
   * 返回 OpenAI 兼容的工具格式
   */
  async getTools() {
    if (!this.client) throw new Error("Client not initialized");

    console.error("[MCP-Client] Fetching available tools...");
    const { tools } = await this.client.listTools();
    console.error(
      "[MCP-Client] Found",
      tools.length,
      "tools:",
      tools.map((t) => t.name).join(", ")
    );

    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(name: string, args: Record<string, unknown>) {
    if (!this.client) throw new Error("Client not initialized");

    console.error(
      "[MCP-Client] Calling tool:",
      name,
      "| args:",
      JSON.stringify(args)
    );
    const startTime = Date.now();

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      const duration = Date.now() - startTime;
      console.error("[MCP-Client] Tool call completed in", duration, "ms");

      // 提取文本内容
      if (!result.content || !Array.isArray(result.content)) {
        console.error("[MCP-Client] ⚠️ Tool returned no content");
        return "";
      }

      const textContent = result.content
        .filter((item: { type: string; text?: string }) => item.type === "text")
        .map((item: { type: string; text?: string }) => item.text || "")
        .join("\n");

      console.error(
        "[MCP-Client] ✅ Tool result length:",
        textContent.length,
        "characters"
      );
      return textContent;
    } catch (error) {
      console.error(
        "[MCP-Client] ❌ Error calling tool:",
        name,
        "|",
        (error as Error).message
      );
      return `Error: ${(error as Error).message}`;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.server) {
      await this.server.close();
      this.server = null;
    }
    this.initialized = false;
  }
}

// 导出单例实例
export const mcpClient = new MCPClient();
