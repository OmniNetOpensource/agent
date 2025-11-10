import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

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
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

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
   * 注册所有 MCP 工具
   */
  private registerTools() {
    if (!this.server) throw new Error("Server not initialized");

    const toolNames: string[] = [];

    // 工具：echo
    console.error("[MCP-Client] Registering tool: echo");
    toolNames.push("echo");
    this.server.registerTool(
      "echo",
      {
        description: "Echo back the provided text",
        inputSchema: {
          text: z.string().describe("The text to echo back"),
        },
      },
      async ({ text }) => {
        console.error("[MCP-Tool:echo] Input:", text);
        return {
          content: [
            {
              type: "text",
              text: text,
            },
          ],
        };
      }
    );

    // 工具：read_file
    console.error("[MCP-Client] Registering tool: read_file");
    toolNames.push("read_file");
    this.server.registerTool(
      "read_file",
      {
        description: "Read a UTF-8 file relative to the project root",
        inputSchema: {
          filepath: z.string().describe("Path to the file relative to project root"),
        },
      },
      async ({ filepath }) => {
        console.error("[MCP-Tool:read_file] Reading file:", filepath);
        try {
          const root = process.cwd();
          const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;
          const requested = path.resolve(root, filepath);

          console.error("[MCP-Tool:read_file] Resolved path:", requested);

          // 安全检查
          if (!(requested === root || requested.startsWith(normalizedRoot))) {
            console.error("[MCP-Tool:read_file] ❌ Access denied - path escapes project root");
            return {
              content: [
                {
                  type: "text",
                  text: "Error: Access denied - path escapes project root",
                },
              ],
              isError: true,
            };
          }

          const data = await fs.readFile(requested, "utf8");
          console.error("[MCP-Tool:read_file] ✅ File read successfully, size:", data.length, "bytes");
          return {
            content: [
              {
                type: "text",
                text: data,
              },
            ],
          };
        } catch (error) {
          console.error("[MCP-Tool:read_file] ❌ Error:", (error as Error).message);
          return {
            content: [
              {
                type: "text",
                text: `Error reading file: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 工具：fetch_url
    console.error("[MCP-Client] Registering tool: fetch_url");
    toolNames.push("fetch_url");
    this.server.registerTool(
      "fetch_url",
      {
        description: "Fetch content from a URL and convert it to markdown. Useful for reading web pages, documentation, or API responses.",
        inputSchema: {
          url: z.string().url().describe("The URL to fetch"),
        },
      },
      async ({ url }) => {
        console.error("[MCP-Tool:fetch_url] Fetching URL:", url);
        try {
          const response = await fetch(url);

          if (!response.ok) {
            console.error("[MCP-Tool:fetch_url] ❌ HTTP error:", response.status, response.statusText);
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
          console.error("[MCP-Tool:fetch_url] ✅ Fetched text/HTML, original size:", text.length, "bytes");

          // 简单的 HTML 转文本（移除标签）
          const cleanText = text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          console.error("[MCP-Tool:fetch_url] Cleaned text size:", cleanText.length, "bytes (truncated to 10000)");
          return {
            content: [
              {
                type: "text",
                text: cleanText.substring(0, 10000), // 限制长度
              },
            ],
          };
        } catch (error) {
          console.error("[MCP-Tool:fetch_url] ❌ Error:", (error as Error).message);
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

    // 工具：brave_search（可选，需要 BRAVE_API_KEY）
    if (process.env.BRAVE_API_KEY) {
      console.error("[MCP-Client] Registering tool: brave_search (API key found)");
      toolNames.push("brave_search");
      this.server.registerTool(
        "brave_search",
        {
          description: "Search the web using Brave Search API. Get real-time, up-to-date information from the internet. Supports web search, news, and image results.",
          inputSchema: {
            query: z.string().describe("The search query"),
            count: z.number().optional().describe("Number of results to return (default: 10, max: 20)"),
            freshness: z.enum(["pd", "pw", "pm", "py"]).optional().describe("Time filter: pd=past day, pw=past week, pm=past month, py=past year"),
          },
        },
        async ({ query, count = 10, freshness }) => {
          console.error("[MCP-Tool:brave_search] Searching for:", query, "| count:", count, "| freshness:", freshness || "none");
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
                  "Accept": "application/json",
                  "Accept-Encoding": "gzip",
                  "X-Subscription-Token": process.env.BRAVE_API_KEY!,
                },
              }
            );

            if (!response.ok) {
              console.error("[MCP-Tool:brave_search] ❌ API error:", response.status, response.statusText);
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
            console.error("[MCP-Tool:brave_search] ✅ Got results, web:", data.web?.results?.length || 0, "| news:", data.news?.results?.length || 0);

            // 格式化搜索结果
            let resultText = `Search results for: "${query}"\n\n`;

            if (data.web?.results && data.web.results.length > 0) {
              resultText += "Web Results:\n\n";
              data.web.results.forEach((result: { title: string; url: string; description?: string }, index: number) => {
                resultText += `${index + 1}. ${result.title}\n`;
                resultText += `   URL: ${result.url}\n`;
                resultText += `   ${result.description || "No description"}\n\n`;
              });
            }

            // 添加新闻结果（如果有）
            if (data.news?.results && data.news.results.length > 0) {
              resultText += "\nNews Results:\n\n";
              data.news.results.slice(0, 3).forEach((result: { title: string; source?: string; description?: string }, index: number) => {
                resultText += `${index + 1}. ${result.title}\n`;
                resultText += `   Source: ${result.source || "Unknown"}\n`;
                resultText += `   ${result.description || ""}\n\n`;
              });
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
            console.error("[MCP-Tool:brave_search] ❌ Error:", (error as Error).message);
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

    // 工具：browser_screenshot
    console.error("[MCP-Client] Registering tool: browser_screenshot");
    toolNames.push("browser_screenshot");
    this.server.registerTool(
      "browser_screenshot",
      {
        description: "Take a screenshot of a webpage using a real browser. Useful for capturing visual content, testing UI, or saving page state.",
        inputSchema: {
          url: z.string().url().describe("The URL to screenshot"),
          fullPage: z.boolean().optional().describe("Capture full scrollable page (default: false)"),
          waitSeconds: z.number().optional().describe("Seconds to wait before screenshot (default: 2)"),
          headless: z.boolean().optional().describe("Run browser in headless mode (default: true, set false to see browser)"),
        },
      },
      async ({ url, fullPage = false, waitSeconds = 2, headless = true }) => {
        console.error("[MCP-Tool:browser_screenshot] Taking screenshot of:", url, "| fullPage:", fullPage, "| wait:", waitSeconds, "s | headless:", headless);
        let browser;
        try {
          console.error("[MCP-Tool:browser_screenshot] Launching browser...");
          browser = await chromium.launch({
            headless,
            slowMo: headless ? 0 : 100, // 非 headless 模式下减慢操作，便于观察
          });
          const page = await browser.newPage();

          console.error("[MCP-Tool:browser_screenshot] Navigating to URL...");
          await page.goto(url, { waitUntil: "networkidle" });
          console.error("[MCP-Tool:browser_screenshot] Waiting", waitSeconds, "seconds...");
          await page.waitForTimeout(waitSeconds * 1000);

          console.error("[MCP-Tool:browser_screenshot] Taking screenshot...");
          const screenshot = await page.screenshot({
            fullPage,
            type: "png",
          });

          await browser.close();
          console.error("[MCP-Tool:browser_screenshot] ✅ Screenshot taken, size:", (screenshot.length / 1024).toFixed(2), "KB");

          return {
            content: [
              {
                type: "text",
                text: `Screenshot taken successfully for ${url}. Image size: ${(screenshot.length / 1024).toFixed(2)} KB`,
              },
            ],
          };
        } catch (error) {
          console.error("[MCP-Tool:browser_screenshot] ❌ Error:", (error as Error).message);
          if (browser) await browser.close();
          return {
            content: [
              {
                type: "text",
                text: `Error taking screenshot: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 工具：browser_extract
    console.error("[MCP-Client] Registering tool: browser_extract");
    toolNames.push("browser_extract");
    this.server.registerTool(
      "browser_extract",
      {
        description: "Extract content from a webpage using a real browser. Handles JavaScript-rendered content that fetch_url cannot access.",
        inputSchema: {
          url: z.string().url().describe("The URL to extract from"),
          selector: z.string().optional().describe("CSS selector to extract specific element (optional)"),
          waitForSelector: z.string().optional().describe("Wait for this selector before extracting (optional)"),
          headless: z.boolean().optional().describe("Run browser in headless mode (default: true, set false to see browser)"),
        },
      },
      async ({ url, selector, waitForSelector, headless = true }) => {
        console.error("[MCP-Tool:browser_extract] Extracting from:", url, "| selector:", selector || "full page", "| waitFor:", waitForSelector || "none", "| headless:", headless);
        let browser;
        try {
          console.error("[MCP-Tool:browser_extract] Launching browser...");
          browser = await chromium.launch({
            headless,
            slowMo: headless ? 0 : 100,
          });
          const page = await browser.newPage();

          console.error("[MCP-Tool:browser_extract] Navigating to URL...");
          await page.goto(url, { waitUntil: "networkidle" });

          // 等待特定元素
          if (waitForSelector) {
            console.error("[MCP-Tool:browser_extract] Waiting for selector:", waitForSelector);
            await page.waitForSelector(waitForSelector, { timeout: 10000 });
          }

          // 提取内容
          let content;
          if (selector) {
            // 提取特定元素
            console.error("[MCP-Tool:browser_extract] Extracting element:", selector);
            content = await page.textContent(selector);
          } else {
            // 提取整个页面的文本
            console.error("[MCP-Tool:browser_extract] Extracting full page text");
            content = await page.evaluate(() => document.body.innerText);
          }

          await browser.close();
          console.error("[MCP-Tool:browser_extract] ✅ Extracted, content length:", content?.length || 0, "characters");

          return {
            content: [
              {
                type: "text",
                text: content || "No content found",
              },
            ],
          };
        } catch (error) {
          console.error("[MCP-Tool:browser_extract] ❌ Error:", (error as Error).message);
          if (browser) await browser.close();
          return {
            content: [
              {
                type: "text",
                text: `Error extracting content: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // 工具：browser_interact
    console.error("[MCP-Client] Registering tool: browser_interact");
    toolNames.push("browser_interact");
    this.server.registerTool(
      "browser_interact",
      {
        description: "Interact with a webpage: click buttons, fill forms, navigate. Useful for testing or automating web actions.",
        inputSchema: {
          url: z.string().url().describe("The URL to visit"),
          actions: z.array(
            z.object({
              type: z.enum(["click", "fill", "select", "wait", "screenshot"]).describe("Action type"),
              selector: z.string().optional().describe("CSS selector for the element"),
              value: z.string().optional().describe("Value for fill/select actions"),
              timeout: z.number().optional().describe("Timeout in milliseconds"),
            })
          ).describe("List of actions to perform in order"),
          headless: z.boolean().optional().describe("Run browser in headless mode (default: true, set false to see browser)"),
        },
      },
      async ({ url, actions, headless = true }) => {
        console.error("[MCP-Tool:browser_interact] Interacting with:", url, "| actions:", actions.length, "| headless:", headless);
        let browser;
        try {
          console.error("[MCP-Tool:browser_interact] Launching browser...");
          browser = await chromium.launch({
            headless,
            slowMo: headless ? 0 : 500, // 非 headless 模式下明显减慢，便于观察每个操作
          });
          const page = await browser.newPage();

          console.error("[MCP-Tool:browser_interact] Navigating to URL...");
          await page.goto(url, { waitUntil: "networkidle" });

          const results: string[] = [];

          for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            console.error(`[MCP-Tool:browser_interact] Action ${i + 1}/${actions.length}:`, action.type, action.selector || "");

            switch (action.type) {
              case "click":
                if (action.selector) {
                  await page.click(action.selector);
                  results.push(`Clicked: ${action.selector}`);
                }
                break;

              case "fill":
                if (action.selector && action.value) {
                  await page.fill(action.selector, action.value);
                  results.push(`Filled ${action.selector} with: ${action.value}`);
                }
                break;

              case "select":
                if (action.selector && action.value) {
                  await page.selectOption(action.selector, action.value);
                  results.push(`Selected ${action.value} in: ${action.selector}`);
                }
                break;

              case "wait":
                const waitTime = action.timeout || 1000;
                await page.waitForTimeout(waitTime);
                results.push(`Waited ${waitTime}ms`);
                break;

              case "screenshot":
                const screenshot = await page.screenshot({ type: "png" });
                results.push(`Screenshot taken (${(screenshot.length / 1024).toFixed(2)} KB)`);
                break;
            }
          }

          // 获取最终页面内容
          console.error("[MCP-Tool:browser_interact] Getting final page content...");
          const finalContent = await page.evaluate(() => document.body.innerText);

          await browser.close();
          console.error("[MCP-Tool:browser_interact] ✅ All actions completed successfully");

          return {
            content: [
              {
                type: "text",
                text: `Actions completed:\n${results.join("\n")}\n\nFinal page content:\n${finalContent.substring(0, 5000)}`,
              },
            ],
          };
        } catch (error) {
          console.error("[MCP-Tool:browser_interact] ❌ Error:", (error as Error).message);
          if (browser) await browser.close();
          return {
            content: [
              {
                type: "text",
                text: `Error during interaction: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    console.error("[MCP-Client] ✅ Registered", toolNames.length, "tools:", toolNames.join(", "));
  }

  /**
   * 获取所有可用的工具列表
   * 返回 OpenAI 兼容的工具格式
   */
  async getTools() {
    if (!this.client) throw new Error("Client not initialized");

    console.error("[MCP-Client] Fetching available tools...");
    const { tools } = await this.client.listTools();
    console.error("[MCP-Client] Found", tools.length, "tools:", tools.map(t => t.name).join(", "));

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

    console.error("[MCP-Client] Calling tool:", name, "| args:", JSON.stringify(args));
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

      console.error("[MCP-Client] ✅ Tool result length:", textContent.length, "characters");
      return textContent;
    } catch (error) {
      console.error("[MCP-Client] ❌ Error calling tool:", name, "|", (error as Error).message);
      return `Error: ${(error as Error).message}`;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this.client) {
      await this.client.close();
    }
    if (this.server) {
      await this.server.close();
    }
    this.initialized = false;
  }
}

// 导出单例实例
export const mcpClient = new MCPClient();
