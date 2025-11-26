# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI chat interface built with Next.js 16 (React 19) that talks to OpenRouter via the official @openrouter/sdk (OpenAI-compatible schema). Features include:

- Research-focused UI streaming AI's thinking process, tool calls, and search results in real-time
- Optional Supabase integration for authentication (Google OAuth) and conversation persistence
- Feature-based architecture with Zustand for state management

## Environment Configuration

Required environment variables in `.env.local`:

**OpenRouter (required)**:
- `OPENROUTER_API_KEY`: OpenRouter API key
- `OPENROUTER_DEFAULT_MODEL`: Optional default model id (e.g. `openrouter/auto`)
- `OPENROUTER_HTTP_REFERER` / `OPENROUTER_X_TITLE`: Optional but recommended headers

**Tools (optional)**:
- `BRAVE_API_KEY`: Enables web search tool

**Supabase (optional, enables auth & persistence)**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`: Supabase anonymous key

Without Supabase configured, the app works in guest mode with in-memory storage.

## Project Structure

The project uses a feature-based architecture:

```
app/                              # Next.js app directory
├── api/
│   ├── chat/route.ts             # Main chat streaming endpoint
│   ├── conversations/            # Conversation management API
│   │   ├── route.ts              # GET: List conversations
│   │   └── [id]/
│   │       ├── route.ts          # DELETE: Remove conversation
│   │       └── messages/route.ts # GET: Load conversation messages
│   └── models/route.ts           # GET: Fetch available OpenRouter models
├── auth/callback/route.ts        # OAuth callback handler
├── c/[conversationId]/page.tsx   # Dynamic conversation route
├── layout.tsx                    # Root layout with Sidebar
└── page.tsx                      # Home/chat page

src/features/                     # Feature-based modules
├── auth/                         # Authentication feature
│   ├── components/
│   │   ├── LoginButton.tsx
│   │   └── UserMenu.tsx
│   └── hooks/useAuth.ts
├── chat/                         # Main chat feature
│   ├── components/
│   │   ├── Composer.tsx
│   │   ├── Header.tsx
│   │   ├── MessageList.tsx
│   │   └── message/
│   │       ├── MessageItem.tsx
│   │       ├── PendingIndicator.tsx
│   │       └── research/
│   ├── store/useChatStore.ts     # Zustand store for chat state
│   └── types/chat.ts             # Message types
├── model/                        # Model selection
│   ├── components/ModelSelector.tsx
│   └── lib/openrouter.ts
├── preview/                      # Code preview panel
│   ├── components/PreviewPanel.tsx
│   └── store/usePreviewStore.ts
├── sidebar/                      # Navigation sidebar
│   └── components/
│       ├── Sidebar.tsx
│       ├── ConversationList.tsx
│       └── ConversationItem.tsx
├── theme/hooks/useTheme.ts
└── shared/                       # Shared utilities
    ├── components/
    │   ├── CodeBlock.tsx
    │   └── Markdown.tsx
    └── lib/tools/                # Tool implementations

lib/supabase/                     # Server-side Supabase utilities
├── config.ts
├── server.ts
├── client.ts
└── middleware.ts

types/conversation.ts             # Global DB types
```

## Architecture

### OpenRouter Integration

The chat API ([app/api/chat/route.ts](app/api/chat/route.ts)) talks to OpenRouter through @openrouter/sdk chat.send (OpenAI-compatible payload):

- **Client initialization**: Uses `OPENROUTER_API_KEY` plus [src/features/model/lib/openrouter.ts](src/features/model/lib/openrouter.ts) helper
- **Reasoning stream**: Reads the provider-specific `reasoning` field (exposed by some OpenRouter models) and forwards it to the UI as "thinking" events

### Streaming Architecture

The system uses Server-Sent Events (SSE) to stream multiple types of data:

1. **thinking**: Reasoning content from the LLM
2. **content**: Regular assistant message content
3. **tool_call**: When the LLM decides to use a tool
4. **tool_progress**: Progress updates during tool execution
5. **tool_result**: Results returned from tool execution
6. **conversation_created**: When a new conversation is created (authenticated users)

All streaming happens in [app/api/chat/route.ts](app/api/chat/route.ts) with up to 20 iterations for multi-step tool usage.

### Tools System

Modular tool system in [src/shared/lib/tools/](src/shared/lib/tools/):

- **Tool registration**: Each tool has a `spec` (OpenAI-style tool schema), `handler`, and availability check
- **Dynamic enabling**: Tools auto-disable if missing API keys
- **Result truncation**: All tool results are truncated to 10,000 characters
- **Progress callbacks**: Tools can report progress during execution
- **Built-in tools**:
  - `fetch_url`: Fetches and strips HTML/JS/CSS from URLs
  - `brave_search`: Web search with freshness filters (pd/pw/pm/py)

To add a new tool:

1. Create tool file in `src/shared/lib/tools/`
2. Define spec with OpenAI-style tool schema
3. Implement handler function with `ToolHandler` type
4. Register in tools index with availability check

### Message Structure

Messages use a nested block structure ([src/features/chat/types/chat.ts](src/features/chat/types/chat.ts)):

```typescript
Message = {
  role: "user" | "assistant"
  blocks: ContentBlock[]
}

ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[] }

ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; data: { call, progress, result } }
```

This structure allows the UI to:

- Separate assistant's response text from research process
- Collapse/expand thinking and tool execution details
- Auto-collapse previous research blocks when new ones arrive

### State Management

The project uses Zustand stores for state management:

**Chat Store** ([src/features/chat/store/useChatStore.ts](src/features/chat/store/useChatStore.ts)):
- `messages`: Current conversation messages
- `conversations`: List of saved conversations (from Supabase)
- `conversationId`: Active conversation ID
- `pending`: Whether AI is generating
- `currentModel`: Selected OpenRouter model
- `pendingAttachments`: Files waiting to be sent
- Key actions: `sendMessage()`, `appendToAssistant()`, `fetchConversations()`, `selectConversation()`, `deleteConversation()`

**Preview Store** ([src/features/preview/store/usePreviewStore.ts](src/features/preview/store/usePreviewStore.ts)):
- Manages code preview panel state

### Authentication & Persistence

When Supabase is configured:

1. User clicks Login → `useAuth.signIn()` triggers Google OAuth
2. Callback at [app/auth/callback/route.ts](app/auth/callback/route.ts) validates session
3. Middleware ([lib/supabase/middleware.ts](lib/supabase/middleware.ts)) refreshes auth cookies
4. Chat API automatically creates conversations and saves messages
5. Sidebar shows conversation list with click-to-navigate

Without Supabase:
- App works in guest mode with in-memory storage
- No login required, conversations not persisted

### Routing

- `/` - Home page (new chat)
- `/c/[conversationId]` - Load specific conversation from URL

## Key Patterns

### Conversation History

The chat API maintains conversation context by:

1. Frontend sends `conversationHistory` array with each request
2. Backend prepends a system prompt with today's date and search guidelines
3. Messages are accumulated in `useChatStore` `messages` state
4. Only `content` blocks are sent to API (research blocks are UI-only)
5. For authenticated users, conversations are automatically saved to Supabase

### Tool Execution Loop

In [app/api/chat/route.ts](app/api/chat/route.ts):

1. Send messages to LLM with tool specs
2. Stream response chunks
3. If `finish_reason === "tool_calls"`:
   - Execute tools via `callToolByName`
   - Stream tool call, progress, and result to client
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
