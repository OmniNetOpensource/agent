# Agent MCP 服务器使用指南

## 🚀 快速开始

### 1. 运行 MCP 服务器

```bash
pnpm mcp
```

服务器会在 stdio 模式下运行，等待连接。

### 2. 连接到 Claude Desktop

#### Windows 用户

1. 打开配置文件：`%APPDATA%\Claude\claude_desktop_config.json`
2. 添加以下配置：

```json
{
  "mcpServers": {
    "agent-mcp": {
      "command": "node",
      "args": ["d:\\develop\\projects\\agent\\mcp\\server.mjs"]
    }
  }
}
```

**注意**：将路径替换为你的实际项目路径！

3. 重启 Claude Desktop

#### macOS 用户

1. 打开配置文件：`~/Library/Application Support/Claude/claude_desktop_config.json`
2. 添加以下配置：

```json
{
  "mcpServers": {
    "agent-mcp": {
      "command": "node",
      "args": ["/your/actual/path/to/agent/mcp/server.mjs"]
    }
  }
}
```

3. 重启 Claude Desktop

### 3. 测试工具

在 Claude Desktop 中尝试：

**测试 echo 工具**：
```
使用 echo 工具，输入 "Hello MCP!"
```

**测试 read_file 工具**：
```
读取 package.json 文件
```

## 🛠️ 可用工具

### 1. echo
- **功能**：回显输入的文本
- **参数**：
  - `text` (string): 要回显的文本
- **示例**：输入 "Hello"，返回 "Hello"

### 2. read_file
- **功能**：读取项目根目录下的文件（UTF-8 编码）
- **参数**：
  - `filepath` (string): 相对于项目根目录的文件路径
- **安全**：自动阻止读取项目目录外的文件
- **示例**：`package.json`、`README.md`

## 🧪 使用 MCP Inspector 调试

MCP Inspector 是一个网页调试工具：

```bash
npx @modelcontextprotocol/inspector node mcp/server.mjs
```

然后在浏览器中打开显示的 URL，你可以：
- 查看所有可用工具
- 测试工具调用
- 查看请求和响应

## 📁 项目结构

```
agent/
├── mcp/
│   ├── server.mjs          # MCP 服务器主文件
│   └── README.md           # 本文件
├── package.json
└── ...
```

## 🔧 开发

### 添加新工具

编辑 `server.mjs`，使用 `server.registerTool()` 注册新工具：

```javascript
server.registerTool(
  "tool_name",
  {
    description: "工具描述",
    inputSchema: {
      param1: z.string().describe("参数描述"),
    },
  },
  async ({ param1 }) => {
    // 工具逻辑
    return {
      content: [{
        type: "text",
        text: "结果"
      }]
    };
  }
);
```

### 添加新资源

```javascript
server.registerResource(
  "resource_name",
  "resource://uri",
  {
    description: "资源描述",
  },
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/plain",
        text: "资源内容"
      }]
    };
  }
);
```

## 📚 相关资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP 规范](https://github.com/modelcontextprotocol/specification)

## ⚠️ 注意事项

1. **路径安全**：`read_file` 工具会自动阻止访问项目目录外的文件
2. **编码**：目前仅支持 UTF-8 编码的文件
3. **日志**：使用 `console.error()` 而非 `console.log()`（避免破坏 JSON-RPC）

## 🐛 故障排查

### 服务器无法启动
- 确保已安装依赖：`pnpm install`
- 检查 Node.js 版本：需要 16 或更高

### Claude Desktop 看不到工具
- 检查配置文件路径是否正确
- 确保配置文件是有效的 JSON
- 完全退出并重启 Claude Desktop（不只是关闭窗口）

### 工具调用失败
- 使用 MCP Inspector 测试
- 查看服务器 stderr 输出的错误信息
