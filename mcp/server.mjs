import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

// 创建 MCP 服务器
const server = new McpServer({
  name: "agent-mcp",
  version: "0.1.0",
  capabilities: {
    tools: {},
  },
});

// 注册工具：echo
server.registerTool(
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

// 注册工具：read_file
server.registerTool(
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

      // 安全检查：确保路径不会逃逸到项目根目录之外
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
            text: `Error reading file: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 使用 stderr 输出日志（stdout 会破坏 JSON-RPC 消息）
  console.error("Agent MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
