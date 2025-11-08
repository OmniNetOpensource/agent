# MCP TypeScript SDK 官方文档

## 概述

**Model Context Protocol (MCP) TypeScript SDK** 提供了 MCP 规范的完整实现，使开发者能够：

- 创建暴露资源、提示和工具的 MCP 服务器
- 构建可连接到任何 MCP 服务器的 MCP 客户端
- 使用标准传输，如 stdio 和 Streamable HTTP

## 安装

```bash
npm install @modelcontextprotocol/sdk
```

或使用 yarn：

```bash
yarn add @modelcontextprotocol/sdk
```

或使用 pnpm：

```bash
pnpm add @modelcontextprotocol/sdk
```

## 核心组件

### 服务器设置

初始化一个基本配置的 MCP 服务器：

```typescript
import { McpServer } from '@modelcontextprotocol/sdk';

const server = new McpServer({
  name: 'my-app',
  version: '1.0.0'
});
```

### 服务器配置选项

```typescript
interface ServerOptions {
  name: string;           // 服务器名称
  version: string;        // 服务器版本
  description?: string;   // 服务器描述（可选）
}
```

## 三大核心功能

### 1. Tools（工具）

工具使 LLM 能够控制操作。它们接受参数并返回结构化结果。

#### 基础工具示例

```typescript
import { z } from 'zod';

server.registerTool(
  'calculate-bmi',
  {
    title: 'BMI Calculator',
    description: 'Calculate Body Mass Index',
    inputSchema: {
      type: 'object',
      properties: {
        weightKg: {
          type: 'number',
          description: 'Weight in kilograms'
        },
        heightM: {
          type: 'number',
          description: 'Height in meters'
        }
      },
      required: ['weightKg', 'heightM']
    },
    outputSchema: {
      type: 'object',
      properties: {
        bmi: { type: 'number' }
      }
    }
  },
  async ({ weightKg, heightM }) => {
    const bmi = weightKg / (heightM * heightM);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ bmi: bmi.toFixed(2) })
      }],
      structuredContent: { bmi }
    };
  }
);
```

#### 使用 Zod 验证

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

server.registerTool(
  'create-user',
  {
    title: 'Create User',
    description: 'Create a new user',
    inputSchema: UserSchema
  },
  async (input) => {
    // input 已自动验证
    const user = await createUserInDatabase(input);
    return {
      content: [{
        type: 'text',
        text: `User created: ${user.id}`
      }]
    };
  }
);
```

#### 带进度报告的工具

```typescript
server.registerTool(
  'process-items',
  {
    title: 'Process Items',
    description: 'Process a list of items with progress tracking',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['items']
    }
  },
  async ({ items }, { onProgress }) => {
    const total = items.length;
    const results = [];

    for (let i = 0; i < items.length; i++) {
      // 报告进度
      onProgress?.({
        progress: i + 1,
        total,
        message: `Processing ${items[i]}`
      });

      // 处理项目
      const result = await processItem(items[i]);
      results.push(result);
    }

    return {
      content: [{
        type: 'text',
        text: `Processed ${results.length} items`
      }],
      structuredContent: { results }
    };
  }
);
```

### 2. Resources（资源）

资源暴露数据供消费，无副作用。

#### 静态资源

```typescript
server.registerResource(
  'config',
  'config://app',
  {
    title: 'Application Config',
    description: 'Application configuration data',
    mimeType: 'application/json'
  },
  async (uri) => {
    const config = await loadConfig();
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(config, null, 2)
      }]
    };
  }
);
```

#### 动态资源（URI 模板）

```typescript
import { ResourceTemplate } from '@modelcontextprotocol/sdk';

server.registerResource(
  'user-profile',
  new ResourceTemplate('users://{userId}/profile', {
    list: undefined  // 支持列出所有用户
  }),
  {
    title: 'User Profile',
    description: 'Get user profile information'
  },
  async (uri, { userId }) => {
    const profile = await getUserProfile(userId);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(profile)
      }]
    };
  }
);
```

#### 列出资源

```typescript
server.setResourceListHandler(async () => {
  const users = await getAllUsers();
  return {
    resources: users.map(user => ({
      uri: `users://${user.id}/profile`,
      name: `${user.name}'s Profile`,
      mimeType: 'application/json',
      description: `Profile for ${user.name}`
    }))
  };
});
```

#### 资源模板

支持参数化 URI：

```typescript
server.registerResource(
  'file-content',
  new ResourceTemplate('file:///{path}', {
    list: async () => {
      const files = await listAllFiles();
      return files.map(f => f.path);
    }
  }),
  {
    title: 'File Content',
    description: 'Read file content'
  },
  async (uri, { path }) => {
    const content = await readFile(path);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: content
      }]
    };
  }
);
```

### 3. ResourceLinks（资源链接）

工具可以返回 ResourceLink 对象来引用资源，而不嵌入完整内容。这对于大文件的性能优化很有用。

```typescript
server.registerTool(
  'get-project-files',
  {
    title: 'Get Project Files',
    description: 'Get list of project files as resource links'
  },
  async () => {
    const files = await listProjectFiles();

    return {
      content: files.map(file => ({
        type: 'resource_link',
        uri: `file:///${file.path}`,
        name: file.name,
        mimeType: file.mimeType,
        description: `File: ${file.name}`
      }))
    };
  }
);
```

**ResourceLink 的优势**：
- 避免传输大文件内容
- 让客户端按需加载资源
- 提高响应速度

## Prompts（提示）

提示是可重用的模板，用于定义交互模式。

```typescript
server.registerPrompt(
  'code-review',
  {
    title: 'Code Review',
    description: 'Review code for best practices',
    arguments: [
      {
        name: 'language',
        description: 'Programming language',
        required: true
      },
      {
        name: 'code',
        description: 'Code to review',
        required: true
      }
    ]
  },
  async ({ language, code }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review this ${language} code:\n\n${code}`
          }
        }
      ]
    };
  }
);
```

## 运行服务器

### 方式 1: Streamable HTTP (推荐用于生产环境)

```typescript
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true
  });

  // 处理连接关闭
  res.on('close', () => {
    transport.close();
  });

  // 连接服务器
  await server.connect(transport);

  // 处理请求
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
```

### 方式 2: Stdio (用于本地集成)

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk';

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // 服务器现在通过 stdin/stdout 通信
}

main().catch(console.error);
```

### 方式 3: SSE (Server-Sent Events)

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk';
import express from 'express';

const app = express();

app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/messages', res);
  await server.connect(transport);
});

app.post('/mcp/messages', express.json(), async (req, res) => {
  // 处理来自客户端的消息
  await transport.handlePostMessage(req, res);
});

app.listen(3000);
```

## 客户端连接

### 使用 MCP Inspector

MCP Inspector 是一个交互式调试工具：

```bash
npx @modelcontextprotocol/inspector
```

在浏览器中打开后，输入服务器 URL（例如 `http://localhost:3000/mcp`）。

### 使用 Claude Code

```bash
# 添加 HTTP 传输服务器
claude mcp add --transport http my-server http://localhost:3000/mcp

# 添加 stdio 传输服务器
claude mcp add --transport stdio my-server node /path/to/server.js
```

### 使用 Claude Desktop

在 Claude Desktop 配置文件中添加：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

## 完整示例：文件系统服务器

```typescript
import { McpServer } from '@modelcontextprotocol/sdk';
import { ResourceTemplate } from '@modelcontextprotocol/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// 创建服务器
const server = new McpServer({
  name: 'filesystem-server',
  version: '1.0.0',
  description: 'MCP server for filesystem operations'
});

// 工具：读取文件
server.registerTool(
  'read-file',
  {
    title: 'Read File',
    description: 'Read content from a file',
    inputSchema: z.object({
      path: z.string().describe('File path to read')
    })
  },
  async ({ path: filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading file: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// 工具：写入文件
server.registerTool(
  'write-file',
  {
    title: 'Write File',
    description: 'Write content to a file',
    inputSchema: z.object({
      path: z.string().describe('File path to write'),
      content: z.string().describe('Content to write')
    })
  },
  async ({ path: filePath, content }) => {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return {
        content: [{
          type: 'text',
          text: `Successfully wrote ${content.length} bytes to ${filePath}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error writing file: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// 工具：列出目录
server.registerTool(
  'list-directory',
  {
    title: 'List Directory',
    description: 'List contents of a directory',
    inputSchema: z.object({
      path: z.string().describe('Directory path'),
      includeHidden: z.boolean().optional().describe('Include hidden files')
    })
  },
  async ({ path: dirPath, includeHidden = false }, { onProgress }) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const total = entries.length;
      const results = [];

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];

        // 跳过隐藏文件
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // 报告进度
        onProgress?.({
          progress: i + 1,
          total,
          message: `Scanning ${entry.name}`
        });

        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        results.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }],
        structuredContent: { entries: results }
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error listing directory: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// 资源：文件内容
server.registerResource(
  'file-content',
  new ResourceTemplate('file:///{path}'),
  {
    title: 'File Content',
    description: 'Read file as a resource'
  },
  async (uri, { path: filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: content
      }]
    };
  }
);

// 启动 HTTP 服务器
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true
  });

  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Filesystem MCP server running on http://localhost:${PORT}/mcp`);
});
```

## 错误处理

### 工具错误

```typescript
server.registerTool(
  'divide',
  {
    title: 'Divide Numbers',
    inputSchema: z.object({
      a: z.number(),
      b: z.number()
    })
  },
  async ({ a, b }) => {
    if (b === 0) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Division by zero'
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: String(a / b)
      }]
    };
  }
);
```

### 全局错误处理

```typescript
server.setErrorHandler((error) => {
  console.error('Server error:', error);
  return {
    code: error.code || -32603,
    message: error.message || 'Internal server error',
    data: error.data
  };
});
```

## 中间件和拦截器

```typescript
// 请求日志中间件
server.use(async (request, next) => {
  console.log(`[${new Date().toISOString()}] ${request.method}`);
  const startTime = Date.now();

  const response = await next(request);

  const duration = Date.now() - startTime;
  console.log(`[${new Date().toISOString()}] ${request.method} - ${duration}ms`);

  return response;
});

// 认证中间件
server.use(async (request, next) => {
  const token = request.headers?.['authorization'];

  if (!token || !isValidToken(token)) {
    throw new Error('Unauthorized');
  }

  return next(request);
});
```

## 最佳实践

### 1. 使用 TypeScript

充分利用类型安全：

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

server.registerTool<User>(
  'get-user',
  // ... 配置
  async ({ userId }): Promise<User> => {
    return await getUserFromDb(userId);
  }
);
```

### 2. 使用 Zod 进行验证

```typescript
import { z } from 'zod';

const EmailSchema = z.string().email();
const UserCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: EmailSchema,
  age: z.number().int().positive().max(150)
});
```

### 3. 实现健康检查

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: server.version
  });
});
```

### 4. 使用环境变量

```typescript
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
```

### 5. 日志记录

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

server.use(async (request, next) => {
  logger.info(`Request: ${request.method}`);
  return next(request);
});
```

## 许可证

MIT License

## 相关资源

- **GitHub**: https://github.com/modelcontextprotocol/typescript-sdk
- **官方文档**: https://modelcontextprotocol.io
- **MCP 规范**: https://github.com/modelcontextprotocol/specification
- **NPM 包**: https://www.npmjs.com/package/@modelcontextprotocol/sdk

---

*基于 MCP TypeScript SDK 官方文档编译，最后更新: 2025-01-08*
