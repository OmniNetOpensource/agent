# Aether 对话应用

Aether 是一个基于 Next.js 的多模型 AI 对话应用，支持实时搜索、文件附件和会话持久化，适合作为日常问答、信息检索和轻量研究工作台。

## 核心功能

- 多模型大模型支持：通过 OpenRouter 接入多种 LLM，前端可选择模型。
- 流式对话与思维过程展示：消息以 SSE 流式返回，支持「thinking」和工具调用过程可视化。
- 实时搜索与抓取：
  - `brave_search`：调用 Brave Search 获取最新搜索结果。
  - `fetch_url`：抓取网页正文，去除 HTML/JS/CSS 噪音。
- 附件消息：
  - 支持图片、视频、音频和通用文件（PDF、文本等）作为消息附件。
  - 前端预览图片与文件大小信息。
- 会话历史与管理：
  - 登录后对话会保存到 Supabase，支持历史列表展示和按更新时间排序。
  - 支持新建会话、切换会话、删除会话。
- 账号与权限：
  - 使用 Supabase + Google OAuth 登录/登出。
  - 未登录时对话只在当前页面临时存储，登录后才持久化到数据库。
- 研究轨迹（Research）：
  - 记录并展示每轮回答中的思考文本、工具调用进度和结果。
  - 便于追踪模型的检索与推理路径。
- UI 与体验：
  - 侧边栏会话列表 + 用户信息区域。
  - 消息输入区支持多行自动伸缩、上传附件、流式停止/继续。
  - 支持深浅主题（基于 CSS 变量和 Tailwind v4）。

## 技术栈

- 前端框架：Next.js App Router（React 18+）
- UI 与样式：Tailwind CSS v4、Lucide 图标、Framer Motion 动效
- 状态管理：Zustand（`useChatStore` / `useConversationsStore` / `usePreviewStore`）
- 后端服务：
  - Supabase：用户认证（Google OAuth）与会话/消息存储
  - OpenRouter：对接多模型聊天接口与工具调用
  - Brave Search API：可选的实时搜索能力

## 环境变量

在项目根目录创建 `.env.local`，配置以下变量（按需调整）：

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openrouter/auto           # 可选，服务端默认模型
OPENROUTER_HTTP_REFERER=https://your-site.example  # 可选，推荐配置
OPENROUTER_X_TITLE=Your App Name                   # 可选，推荐配置

BRAVE_API_KEY=your_brave_api_key_here              # 可选，启用实时搜索

NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_public_key
```

- `OPENROUTER_API_KEY`：从 [OpenRouter](https://openrouter.ai/) 获取，用于调用 LLM。
- `BRAVE_API_KEY`：从 Brave 控制台获取，用于启用 `brave_search` 工具。
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`：Supabase 项目 URL 与前端可公开密钥，用于认证和持久化会话。

## 本地开发

1. 安装依赖：

   ```bash
   npm install
   # 或
   pnpm install
   ```

2. 启动开发服务器：

   ```bash
   npm run dev
   # 或
   pnpm dev
   ```

3. 打开浏览器访问 `http://localhost:3000` 即可使用应用。
