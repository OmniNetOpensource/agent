# 个人简历

## 基本信息

**姓名**：余蓝浩

**GitHub**：https://github.com/OmniNetOpensource

**求职意向**：前端工程师 / 全栈工程师

## 教育背景

**杭州电子科技大学**  
专业：智能科学与技术
2023 - 2027

## 项目经历

### AI Research Assistant — 智能研究助手

**技术栈**：Next.js 16 · React 19 · TypeScript · Tailwind CSS · Zustand · OpenRouter SDK

**项目简介**：
一款面向研究场景的 AI 聊天应用，实现了实时流式展示 AI 思考过程、工具调用和搜索结果的功能。支持多模型切换，通过模块化工具系统实现可扩展的 Agent 能力。

**核心职责与成果**：

#### 1. 流式架构设计与实现

- 设计并实现基于 **Server-Sent Events (SSE)** 的实时流式传输架构
- 支持四种事件类型：thinking（推理过程）、content（回复内容）、tool_call（工具调用）、tool_result（执行结果）
- 实现最多 **20 轮迭代**的多步骤工具执行循环，支持复杂任务的自动分解与执行

#### 2. 模块化工具系统

- 设计可插拔的工具注册机制，每个工具包含 OpenAI 兼容的 spec 定义、handler 处理函数和可用性检查
- 实现 **动态工具启用**：根据环境变量自动检测 API Key，按需启用/禁用工具
- 内置工具包括：
  - `brave_search`：集成 Brave Search API，支持时间范围过滤（pd/pw/pm/py）
  - `fetch_url`：网页抓取与内容清洗，自动剥离 HTML/JS/CSS

#### 3. 研究过程可视化

- 设计嵌套式消息结构（Message → ContentBlock → ResearchItem），分离回复内容与研究过程
- 实现 Research Block 组件，支持 **折叠/展开** 控制，自动收起历史研究块
- 实时展示 AI 推理链路，增强用户对 AI 决策过程的理解与信任

#### 4. 状态管理与用户体验

- 基于 Zustand 实现轻量级全局状态管理
- 自定义 **useChat Hook**，封装消息累积、流式更新、历史管理等复杂逻辑
- 实现 `appendToAssistant` 函数，类似 reducer 模式处理增量更新与状态合并

#### 5. 富文本渲染系统

- 集成 react-markdown + remark/rehype 插件生态
- 支持 **GitHub Flavored Markdown**、代码语法高亮（highlight.js）、数学公式渲染（KaTeX）
- 优化长内容渲染性能，确保流式输出时的流畅体验

**技术亮点**：

- 完整的 TypeScript 类型覆盖，使用 Zod 进行运行时类型校验
- 采用 Next.js 16 最新特性，包括 App Router、Server Components
- 工具结果自动截断至 10,000 字符，防止上下文溢出
- 响应式设计，支持侧边栏会话管理

---

## 专业技能

- **前端框架**：React 19、Next.js 16（App Router）、TypeScript
- **状态管理**：Zustand、React Hooks
- **样式方案**：Tailwind CSS 4、CSS Modules、Framer Motion 动画
- **AI/LLM 集成**：OpenRouter SDK、OpenAI API、Server-Sent Events (SSE) 流式传输
- **后端能力**：Next.js API Routes、RESTful API 设计、SSE 实时数据流
- **工具链**：pnpm、ESLint、TypeScript 严格模式
- **其他**：Markdown 渲染（KaTeX 数学公式、代码高亮）、Playwright 自动化

---
