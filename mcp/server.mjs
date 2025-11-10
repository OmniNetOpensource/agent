import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 创建 MCP 服务器
const server = new McpServer({
  name: "agent-mcp",
  version: "0.1.0",
  capabilities: {
    tools: {},
  },
});

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
