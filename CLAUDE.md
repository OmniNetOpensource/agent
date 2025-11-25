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

# 用户偏好

- 每次修改代码之前，都要提前说明这样改动会产生什么样的效果、后果，以及为什么要这么做。

- 先看完项目相关代码再回答问题

- 不要用行话、黑话或者复杂的名词，用自然朴素的语言

- 尽可能使用完整详细的表述

- 不要跳太快，慢慢来，我们有的是时间

- 配色只能从global.css里选
