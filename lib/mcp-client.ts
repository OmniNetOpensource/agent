import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

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
    if (this.initialized) return;

    // 创建 MCP 服务器
    this.server = new McpServer({
      name: "agent-mcp",
      version: "0.1.0",
      capabilities: {
        tools: {},
      },
    });

    // 注册工具
    this.registerTools();

    // 创建客户端和服务器传输
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // 创建客户端
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
    await this.server.connect(serverTransport);
    await this.client.connect(clientTransport);

    this.initialized = true;
    console.error("MCP Client initialized");
  }

  /**
   * 注册所有 MCP 工具
   */
  private registerTools() {
    if (!this.server) throw new Error("Server not initialized");

    // 工具：echo
    this.server.registerTool(
      "echo",
      {
        description: "Echo back the provided text",
        inputSchema: {
          text: z.string().describe("The text to echo back"),
        },
      },
      async ({ text }) => {
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
    this.server.registerTool(
      "read_file",
      {
        description: "Read a UTF-8 file relative to the project root",
        inputSchema: {
          filepath: z.string().describe("Path to the file relative to project root"),
        },
      },
      async ({ filepath }) => {
        try {
          const root = process.cwd();
          const normalizedRoot = root.endsWith(path.sep) ? root : root + path.sep;
          const requested = path.resolve(root, filepath);

          // 安全检查
          if (!(requested === root || requested.startsWith(normalizedRoot))) {
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
          return {
            content: [
              {
                type: "text",
                text: data,
              },
            ],
          };
        } catch (error) {
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
  }

  /**
   * 获取所有可用的工具列表
   * 返回 OpenAI 兼容的工具格式
   */
  async getTools() {
    if (!this.client) throw new Error("Client not initialized");

    const { tools } = await this.client.listTools();

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

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      // 提取文本内容
      if (!result.content || !Array.isArray(result.content)) {
        return "";
      }

      const textContent = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n");

      return textContent;
    } catch (error) {
      console.error("Error calling tool:", error);
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
