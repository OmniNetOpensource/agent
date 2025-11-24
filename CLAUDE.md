# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI chat interface built with Next.js 16 that talks to OpenRouter via the official @openrouter/sdk (OpenAI-compatible schema). The UI is research-focused, streaming the AI's thinking process, tool calls, and search results in real-time.

## Environment Configuration

Required environment variables in `.env.local`:

- **OPENROUTER_API_KEY**: OpenRouter API key
- **OPENROUTER_DEFAULT_MODEL**: Optional default model id (e.g. `openrouter/auto`)
- **OPENROUTER_HTTP_REFERER / OPENROUTER_X_TITLE**: Optional but recommended headers for OpenRouter
- **BRAVE_API_KEY**: Optional. Enables web search tool

## Architecture

### OpenRouter Integration

The chat API ([app/api/chat/route.ts](app/api/chat/route.ts)) talks to OpenRouter through @openrouter/sdk chat.send (OpenAI-compatible payload):

- **Client initialization**: Uses `OPENROUTER_API_KEY` plus `lib/openrouter.ts` helper (base URL and headers)
- **Reasoning stream**: Reads the provider-specific `reasoning` field (exposed by some OpenRouter models) and forwards it to the UI as "thinking" events

### Streaming Architecture

The system uses Server-Sent Events (SSE) to stream multiple types of data:

1. **thinking**: Reasoning content from the LLM (some OpenRouter models expose `reasoning`)
2. **content**: Regular assistant message content
3. **tool_call**: When the LLM decides to use a tool
4. **tool_result**: Results returned from tool execution

All streaming happens in [app/api/chat/route.ts](app/api/chat/route.ts) with up to 20 iterations for multi-step tool usage.

### Tools System

Modular tool system in [lib/tools.ts](lib/tools.ts):

- **Tool registration**: Each tool has a `spec` (OpenAI-style tool schema via OpenRouter SDK), `handler`, and availability check
- **Dynamic enabling**: Tools auto-disable if missing API keys
- **Result truncation**: All tool results are truncated to 10,000 characters
- **Built-in tools**:
  - `fetch_url`: Fetches and strips HTML/JS/CSS from URLs
  - `brave_search`: Web search with freshness filters (pd/pw/pm/py)

To add a new tool:

1. Add tool spec to `toolMap` in [lib/tools.ts](lib/tools.ts)
2. Implement handler function with `ToolHandler` type
3. Add availability logic (check for required env vars)

### Message Structure

Messages use a nested block structure ([types/chat.ts](types/chat.ts)):

- **Message**: Has `role` ("user" | "assistant") and array of `ContentBlock`s
- **ContentBlock**: Either `content` (text) or `research` (thinking/tools)
- **ResearchItem**: Can be `thinking`, `tool_call`, or `tool_result`, each with an `isExpanded` state

This structure allows the UI to:

- Separate assistant's response text from research process
- Collapse/expand thinking and tool execution details
- Auto-collapse previous research blocks when new ones arrive

### State Management

The [useChat hook](hooks/useChat.ts) manages all chat state:

- **appendToAssistant**: Complex reducer-like function that handles streaming updates:
  - Accumulates thinking text incrementally
  - Auto-collapses previous research blocks
  - Ensures only one assistant message exists at end of conversation
- **Message history for API**: Filters out research blocks, sends only content to backend
- **Toggle functions**: Expand/collapse individual research blocks or items

## Component Architecture

The UI is organized into:

- **Page component** ([app/page.tsx](app/page.tsx)): Main layout with sidebar and chat area
- **Chat components** (`components/chat/`):
  - `MessageList`: Renders all messages with research blocks
  - `MessageItem`: Individual message with role-based styling
  - `Composer`: Input area with submit handling
  - `ResearchBlock`: Collapsible section showing thinking/tool calls
  - `ResearchItem`: Individual tool call or result
  - `PendingIndicator`: Shows when AI is generating
- **Markdown component** ([components/Markdown.tsx](components/Markdown.tsx)): Renders markdown with syntax highlighting (highlight.js), math (KaTeX), and GitHub-flavored markdown

## Key Patterns

### Conversation History

The chat API maintains conversation context by:

1. Frontend sends `conversationHistory` array with each request
2. Backend prepends a system prompt with today's date and search guidelines (in Chinese)
3. Messages are accumulated in [useChat.ts](hooks/useChat.ts) `messages` state
4. Only `content` blocks are sent to API (research blocks are UI-only)

### Tool Execution Loop

In [app/api/chat/route.ts](app/api/chat/route.ts):

1. Send messages to LLM with tool specs
2. Stream response chunks
3. If `finish_reason === "tool_calls"`:
   - Execute tools via `callToolByName`
   - Stream tool call and result to client
   - Append tool results to conversation
   - Loop back to step 1 (max 20 iterations)
4. If `finish_reason === "stop"`: End stream

### Research Block UI

Research blocks auto-manage expansion state:

- Latest research block is always expanded
- Previous research blocks auto-collapse when new ones arrive
- Within a block, only the latest item is expanded
- Users can manually toggle any block or item

## when finishing development

- 运行 `pnpm check` 检查报错
- 完成之后 commit 这次修改

# user preference

请用朴实、平静、耐心的语言回答我的问题，就像一个有经验的朋友在认真地帮我理解一个话题。语气要温和、鼓励，让人感到你愿意花时间把事情讲清楚。不要使用夸张的形容词和营销式的表达，比如"非常棒"、"超级强大"这类词，而是具体说明实际情况就好。

回答时请关注底层原理和运作机制，不只是停留在表面现象。重点说明"为什么"和"怎么做到的"，而不只是"是什么"。涉及具体机制时，说明内部是如何运作的、各个环节如何衔接、过程中发生了什么变化。

在解释复杂概念时，请从最基础的部分讲起，一步步引导到深层内容。如果某个概念需要先理解一些背景知识或相关话题，可以稍微展开解释一下，帮助建立完整认知框架，确保理解的连贯性。把整个话题拆分成容易消化的小步骤，让人能跟上思路。

请主动预见可能产生歧义或困惑的地方，在讲到这些点时停下来做个说明。比如某个术语有多种含义，或者某个步骤容易被误解，就提前澄清。用具体例子和场景来说明抽象概念，指出新手常见的误区和容易忽略的细节。可以适当使用类比，但要确保类比准确，不要为了简化而丢失关键信息。

默认使用完整句子与成段表述
