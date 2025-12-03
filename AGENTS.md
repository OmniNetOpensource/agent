# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether** is an AI chat application built with Next.js that provides a conversational interface with:

- Multi-model LLM support via OpenRouter
- Real-time web search and URL fetching capabilities
- Message attachments (images, videos, audio, files)
- Persistent conversation history with Supabase
- User authentication and account management
- Research tracking (thinking processes and tool execution visibility)

## Architecture & Structure

### Frontend Structure (`src/`)

- **`src/app/`** - Next.js app directory (routes and layouts)

  - `api/` - Server-side API routes (chat, models, conversations, auth)
  - `c/[conversationId]/` - Chat conversation page
  - `page.tsx` - Home (redirects to `/c/new`)
  - `layout.tsx` - Root layout with Sidebar + Header

- **`src/features/`** - Feature-based organization

  - `chat/` - Chat UI components (MessageList, Composer, Header) and state (useChatStore)
    - `types/chat.ts` - Message, ContentBlock, ResearchItem type definitions
    - Components handle message rendering, tool progress, research visibility
  - `sidebar/` - Conversation history and user profile
    - `useConversationsStore` - Manages conversation list
  - `preview/` - Preview panel (usePreviewStore for preview state)
  - `model/` - Model selection and OpenRouter integration
  - `auth/` - Authentication hooks
  - `theme/` - Theme switching (dark/light mode)

- **`src/shared/`** - Shared utilities and components
  - `lib/tools/` - Tool definitions (brave-search.ts, fetch.ts)
  - `lib/supabase/` - Supabase client configuration
  - `components/` - Shared UI (Markdown, CodeBlock, etc.)
  - `utils/` - Utility functions

### Key Type System (`types/conversation.ts`)

```typescript
Conversation; // DB record with id, user_id, title, timestamps
DbMessage; // DB message with id, blocks, role, timestamps
ContentBlock; // "content" | "attachments" | "research"
Message; // Frontend message: role + blocks[]
ResearchItem; // "thinking" or "tool" execution record
```

## State Management (Zustand)

**`useChatStore`** - Manages chat session state:

- `messages[]` - Conversation history
- `input` - User input text
- `pending` - Loading state during API calls
- `currentModel` - Selected LLM model
- `pendingAttachments[]` - Files being attached
- `conversationId` - Current conversation (or "new")
- Actions: `setInput`, `sendMessage`, `appendToAssistant`, `stop`, etc.

**`useConversationsStore`** - Manages conversation list:

- `conversations[]` - Loaded conversations
- `conversationsLoading` - Fetch state
- `fetchConversations()` - Loads user's conversations from `/api/conversations`

**`usePreviewStore`** - Manages preview panel state

## API Routes

### `POST /api/chat`

Core chat endpoint that:

1. Receives conversation history + selected model
2. Streams response via Server-Sent Events (SSE)
3. Executes tools (brave_search, fetch_url) in a loop up to 20 iterations
4. Broadcasts events: thinking, tool_call, tool_progress, tool_result, content
5. Saves to Supabase when user/assistant messages complete
6. Returns structured message blocks with research items

**Request**: `{ conversationHistory, conversationId, model }`
**Response**: SSE stream with events (type + data)

### `GET /api/models`

Returns available models from OpenRouter API

### `GET /api/conversations`

Fetches user's conversation history (requires auth)

### `GET/POST /api/conversations/[id]`

Get conversation details, delete conversation

### `GET /api/conversations/[id]/messages`

Fetch all messages in a conversation

## Message Block Architecture

Messages use a block-based structure to handle multiple content types:

```typescript
ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[] }

ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; data: ToolExecution }
```

This allows:

- User messages with text + multiple attachments
- Assistant messages with thinking process + tool calls/results + final text
- Progressive rendering as stream arrives

## Environment Variables

Required in `.env.local`:

- `OPENROUTER_API_KEY` - OpenRouter API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

Optional:

- `OPENROUTER_DEFAULT_MODEL` - Default LLM model
- `OPENROUTER_HTTP_REFERER` - HTTP referer header
- `OPENROUTER_X_TITLE` - App title for OpenRouter
- `BRAVE_API_KEY` - Enables web search tool

## Tools Available During Chat

Tools are defined in `src/shared/lib/tools.ts` and sent to OpenRouter as function definitions:

1. **brave_search** - Query web search

   - Input: `{ query: string }`
   - Returns: Search results

2. **fetch_url** - Fetch and parse URL content
   - Input: `{ url: string }`
   - Returns: Plain text content

Tools are called via `/api/chat` streaming loop. The system prompt is in Chinese and instructs the model to search thoroughly before answering.

## Important Patterns & Conventions

### SSE Event Stream Format

Streamed from `/api/chat`:

```
data: {"type": "content", "content": "..."}
data: {"type": "thinking", "content": "..."}
data: {"type": "tool_call", "tool": "...", "args": {...}}
data: {"type": "tool_progress", "tool": "...", "stage": "...", ...}
data: {"type": "tool_result", "tool": "...", "result": "..."}
data: {"type": "conversation_created", "conversationId": "...", ...}
data: {"type": "conversation_updated", "conversationId": "...", ...}
```

### URL Path Aliases

TypeScript path alias configured:

- `@/*` resolves to project root or `./src/*`
- Use for imports: `import { x } from "@/src/features/chat/..."`

### CSS Variables

Global CSS variables defined in `src/app/globals.css` (Tailwind v4 format). Use these for frontend styling instead of hardcoded colors.

### UI Framework

- React 19 with Next.js 16
- Tailwind CSS v4
- Lucide React for icons
- Framer Motion for animations
- React Markdown for message rendering

## File Locations Reference

- Main entry: [src/app/page.tsx](src/app/page.tsx)
- Chat API: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- Chat UI: [src/features/chat/components/](src/features/chat/components/)
- Chat store: [src/features/chat/store/useChatStore.ts](src/features/chat/store/useChatStore.ts)
- Types: [src/features/chat/types/chat.ts](src/features/chat/types/chat.ts)
- Conversation store: [src/features/sidebar/store/useConversationsStore.ts](src/features/sidebar/store/useConversationsStore.ts)
- Supabase client: [src/shared/lib/supabase/client.ts](src/shared/lib/supabase/client.ts)
- Tools: [src/shared/lib/tools.ts](src/shared/lib/tools.ts)

## Developer Preferences

- Review code thoroughly before answering questions
- Use CSS variables from global.css for frontend styling
- Use plain, natural language (avoid jargon)
- Take time with implementation; be detailed
- Don't run pnpm unless necessary
- frontend style need to fit in the current project's style
- write plan first . when i say go, you could just edit without my permission
