# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, GPT-based tools, etc.) when working with code in this repository.

## Project Overview

**Aether** is an AI chat application built with Next.js that provides a conversational interface with:

- Multi-model LLM support via OpenRouter
- Real-time web search and URL fetching capabilities
- Message attachments (images, videos, audio, files)
- Persistent conversation history with Supabase and optional local IndexedDB storage
- User authentication and account management
- Research tracking (thinking processes and tool execution visibility)

## Architecture & Structure

### Frontend Structure (`src/`)

- **`src/app/`** - Next.js app directory (routes and layouts)

  - `api/` - Server-side API routes (chat, conversations, dashboard, sync)
  - `page.tsx` - Root page that redirects to `/app`
  - `app/page.tsx` - Home chat page at `/app` (renders new conversation UI)
  - `app/c/[conversationId]/page.tsx` - Chat conversation page
  - `app/layout.tsx` - App layout with Sidebar + Header
  - `layout.tsx` - Root layout (fonts, theme initialization, providers)

- **`src/features/`** - Feature-based organization

  - `chat/` - Chat UI components (MessageList, Composer, Header) and state (useChatStore)
    - `types/chat.ts` - Message, ContentBlock, ResearchItem type definitions
    - `lib/` - Chat client, streaming parser, model configuration
    - Components handle message rendering, tool progress, research visibility
  - `sidebar/` - Conversation history and user profile
    - `useConversationsStore` - Manages conversation list (remote + local)
  - `preview/` - Preview panel (usePreviewStore for preview state)
  - `dashboard/` - Dashboard stats and local→remote sync (useSync)
  - `auth/` - Authentication hooks and store
  - `theme/` - Theme switching (dark/light mode)

- **`src/shared/`** - Shared utilities and components
  - `components/` - Shared UI (Markdown, CodeBlock, etc.)
  - `lib/tools/` - Tool definitions (brave-search.ts, fetch.ts)
  - `lib/openrouter/` - OpenRouter client and streaming helpers
  - `lib/supabase/` - Supabase client configuration (browser + server)
  - `lib/indexed-db/` - Browser IndexedDB storage for guest conversations
  - `mobile/` - Mobile layout detection/context
  - `toast/` - Toast store and presenter
  - `utils/` - Utility functions (chat formatting, file helpers)

### Key Type System (`types/conversation.ts`)

```typescript
Conversation; // DB record with id, user_id, title, timestamps
DbMessage; // DB message with id, blocks, role, timestamps
ContentBlock; // "content" | "attachments" | "research" | "error"
Message; // Frontend message: role + blocks[]
ResearchItem; // "thinking" or "tool" execution record
```

## State Management (Zustand)

**`useChatStore`** - Manages chat session state:

- `messages[]` - Conversation history
- `input` - User input text
- `pending` - Loading state during API calls
- `chatClient` - Active SSE chat client instance (or `null`)
- `currentModel` - Selected LLM model
- `pendingAttachments[]` - Files being attached
- `uploading` - Whether attachments are uploading
- `conversationId` - Current conversation ID (or `null` when starting a new chat)
- `searchEnabled` - Whether tools (search/fetch) are allowed for this request
- `systemInstruction` - Optional custom system prompt
- Actions: `setInput`, `sendMessage`, `appendToAssistant`, `stop`, `setCurrentModel`, `setSearchEnabled`, `setSystemInstruction`, scroll helpers, etc.

**`useConversationsStore`** - Manages conversation list:

- `conversations[]` - Loaded conversations (merged remote + local)
- `conversationsLoading` - Fetch state
- `hasFetchedRemote` - Whether remote conversations have been fetched
- `hasLoadedLocal` - Whether local IndexedDB conversations have been loaded
- `fetchConversations()` - Loads user's conversations from `/api/conversations`
- `loadLocalConversations()` - Loads guest/local conversations from IndexedDB
- `clearLocal()` - Clears local IndexedDB conversations/messages

**`usePreviewStore`** - Manages preview panel state

## API Routes

### `POST /api/chat`

Core chat endpoint that:

1. Receives conversation history + selected model + optional flags
2. Streams response via Server-Sent Events (SSE)
3. Executes tools (brave_search, fetch_url) in a loop up to 20 iterations
4. Broadcasts events: thinking, tool_call, tool_progress, tool_result, content, error
5. Saves to Supabase when user/assistant messages complete (if Supabase is configured and user is authenticated)
6. Emits `conversation_created` / `conversation_updated` events for both remote and local persistence
7. Returns structured message blocks with research items

**Request**: `{ conversationHistory, conversationId, model, searchEnabled?, systemInstruction? }`  
**Response**: SSE stream with events (type + data)

### `GET /api/conversations`

Fetches authenticated user's conversation history (requires auth), returns a list of conversation metadata. Supports an optional `limit` query parameter (default 10). When Supabase is not configured, returns an empty list.

### `DELETE /api/conversations/[id]`

Deletes a conversation for the authenticated user from Supabase. No GET handler exists; conversation details are reconstructed on the client from messages.

### `GET /api/conversations/[id]/messages`

Fetch all messages in a conversation (requires auth). Returns messages ordered by `created_at`. When Supabase is not configured, returns an empty list.

### `GET /api/dashboard/stats`

Returns basic dashboard statistics for the authenticated user:

- `userMessageCount` - Number of user messages stored in Supabase
- `conversationCount` - Number of conversations in Supabase

When Supabase is not configured, returns an error payload.

### `POST /api/sync`

Synchronizes local (IndexedDB) guest conversations into Supabase for the authenticated user.  
Request body: `{ conversations: { id, title, created_at, updated_at, messages: [...] }[] }`  
Response contains counts of synced conversations and messages, plus optional error messages.

## Message Block Architecture

Messages use a block-based structure to handle multiple content types:

```typescript
ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[] }
  | { type: "error"; message: string }

ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; data: ToolExecution }
```

This allows:

- User messages with text + multiple attachments
- Assistant messages with thinking process + tool calls/results + final text
- Error blocks for surfacing API / tool / network errors in the UI
- Progressive rendering as stream arrives

## Environment Variables

Required in `.env.local`:

- `OPENROUTER_API_KEY` - OpenRouter API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase publishable client key

Optional:

- `OPENROUTER_HTTP_REFERER` - HTTP referer header for OpenRouter
- `OPENROUTER_X_TITLE` - App title for OpenRouter
- `BRAVE_API_KEY` - Enables `brave_search` tool (optional; `fetch_url` is always available)

## Tools Available During Chat

Tools are defined in `src/shared/lib/tools.ts` and sent to OpenRouter as function definitions:

1. **brave_search** - Query web search

   - Input: `{ query: string }`
   - Returns: Search results
   - Only enabled when `BRAVE_API_KEY` is configured

2. **fetch_url** - Fetch and parse URL content
   - Input: `{ url: string }`
   - Returns: Plain text content (via Jina Reader when possible, with progress events)

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
data: {"type": "error", "message": "..."}
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

- Main chat page: [src/app/app/page.tsx](src/app/app/page.tsx)
- Root layout: [src/app/layout.tsx](src/app/layout.tsx)
- App layout (Sidebar + Header): [src/app/app/layout.tsx](src/app/app/layout.tsx)
- Chat API: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- Chat UI: [src/features/chat/components/](src/features/chat/components/)
- Chat store: [src/features/chat/store/useChatStore.ts](src/features/chat/store/useChatStore.ts)
- Types: [src/features/chat/types/chat.ts](src/features/chat/types/chat.ts)
- Conversation store: [src/features/sidebar/store/useConversationsStore.ts](src/features/sidebar/store/useConversationsStore.ts)
- Supabase client: [src/shared/lib/supabase/client.ts](src/shared/lib/supabase/client.ts)
- Local IndexedDB store: [src/shared/lib/indexed-db/](src/shared/lib/indexed-db/)
- Tools: [src/shared/lib/tools.ts](src/shared/lib/tools.ts)

## Developer Preferences

- Review the project thoroughly before answering questions
- Use CSS variables from global.css for frontend styling
- Use plain, natural language (avoid jargon)
- Take time with implementation; be detailed
- frontend style need to fit in the current project's style
- 不需要运行 pnpm 或者 npm 等命令
