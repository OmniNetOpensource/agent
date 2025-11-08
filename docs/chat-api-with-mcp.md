# Chat API 使用 MCP 工具指南

## 🎯 功能说明

你的 `/api/chat` 现在已经集成了 MCP 工具！AI 可以自动调用工具来完成任务。

## 🛠️ 可用工具

### 1. echo
- **功能**：回显文本
- **用法**：AI 会在需要时自动调用

### 2. read_file
- **功能**：读取项目文件
- **用法**：告诉 AI 读取某个文件，它会自动调用此工具

## 📡 API 使用

### 基本请求

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请读取 package.json 文件"
  }'
```

### 带历史记录的请求

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "现在读取 README.md",
    "conversationHistory": [
      {"role": "user", "content": "你好"},
      {"role": "assistant", "content": "你好！我可以帮你什么？"}
    ]
  }'
```

## 🧪 测试示例

### 示例 1：读取文件

**请求**:
```json
{
  "message": "帮我读取 package.json 文件的内容"
}
```

**AI 会自动**:
1. 识别需要使用 `read_file` 工具
2. 调用工具读取文件
3. 分析文件内容
4. 返回总结

### 示例 2：Echo 测试

**请求**:
```json
{
  "message": "使用 echo 工具说 'Hello MCP!'"
}
```

**AI 会**:
1. 调用 `echo` 工具
2. 返回回显结果

## 🔄 工作流程

```
用户请求
    ↓
Chat API 接收
    ↓
初始化 MCP 客户端
    ↓
获取可用工具列表
    ↓
发送给 Gemini AI（附带工具信息）
    ↓
AI 决定是否调用工具
    ↓
【如果需要工具】
    ├─ 调用 MCP 工具
    ├─ 获取工具结果
    └─ 再次询问 AI（附带工具结果）
    ↓
返回最终响应
```

## 🎨 前端集成示例

### React/Next.js

```typescript
async function sendMessage(message: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const text = decoder.decode(value);
    console.log(text); // 显示响应
  }
}

// 使用
sendMessage("读取 package.json 并告诉我项目名称");
```

## ⚙️ 配置

### 环境变量

在 `.env.local` 中设置：

```bash
GEMINI_API_KEY=your_api_key_here
```

## 📋 RequestBody 类型

```typescript
type RequestBody = {
  message: string;                    // 必需：用户消息
  conversationHistory?: Array<{       // 可选：对话历史
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};
```

## 🔍 调试

### 查看工具调用日志

运行开发服务器时，工具调用会输出到控制台：

```bash
pnpm dev
```

当 AI 调用工具时，你会看到：
```
Calling tool: read_file { filepath: 'package.json' }
```

### 检查 MCP 客户端状态

在 API 路由中添加日志：

```typescript
console.error("MCP initialized:", mcpInitialized);
console.error("Available tools:", await mcpClient.getTools());
```

## 🚀 添加新工具

编辑 `lib/mcp-client.ts`，在 `registerTools()` 方法中添加：

```typescript
this.server.registerTool(
  "your_tool_name",
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

## ⚠️ 注意事项

1. **安全性**：`read_file` 工具有路径验证，防止访问项目外的文件
2. **循环限制**：最多 5 次工具调用循环，防止无限递归
3. **流式响应**：目前为了处理工具调用，关闭了流式响应
4. **错误处理**：工具调用失败会返回错误信息给 AI

## 🆘 故障排查

### AI 不调用工具

- 检查 Gemini API 是否支持函数调用
- 尝试更明确的提示词，如"使用 read_file 工具读取..."

### 工具调用失败

- 查看控制台错误日志
- 确保文件路径正确
- 检查文件权限

### 构建失败

- 确保 Zod 版本是 3.x：`pnpm list zod`
- 如果不是，运行：`pnpm add zod@^3.23.8`

## 📚 相关文件

- `/lib/mcp-client.ts` - MCP 客户端实现
- `/app/api/chat/route.ts` - Chat API 路由
- `/mcp/server.mjs` - 独立 MCP 服务器（用于 Claude Desktop）

---

现在你的 Chat API 已经拥有了工具调用能力！🎉
