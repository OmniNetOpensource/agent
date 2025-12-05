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

## Common Development Commands

```bash
pnpm dev           # Start development server (http://localhost:3000)
pnpm build         # Production build
pnpm start         # Start production server
pnpm type-check    # TypeScript validation (no emit)
pnpm lint          # ESLint check
pnpm check         # Full validation: type-check + lint + build
```

**Note**: ESLint disables `react-hooks/exhaustive-deps` to allow flexible dependency arrays in hooks like `useEffect`. TypeScript runs in strict mode.

## Architecture & Structure

### Frontend Structure (`src/`)

- **`src/app/`** - Next.js app directory (routes and layouts)
  - `api/` - Server-side API routes (chat, models, conversations, auth)
  - `(app)/page.tsx` - Home chat page at `/` (renders new conversation UI)
  - `(app)/c/[conversationId]/` - Chat conversation page
  - `(app)/layout.tsx` - App layout with Sidebar + Header

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
Conversation    // DB record with id, user_id, title, timestamps
DbMessage       // DB message with id, blocks, role, timestamps
ContentBlock    // "content" | "attachments" | "research"
Message         // Frontend message: role + blocks[]
ResearchItem    // "thinking" or "tool" execution record
```

## State Management (Zustand)

**`useChatStore`** - Manages chat session state:
- `messages[]` - Conversation history
- `input` - User input text
- `pending` - Loading state during API calls
- `currentModel` - Selected LLM model
- `pendingAttachments[]` - Files being attached
- `conversationId` - Current conversation ID (or `null` when starting a new chat)
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
**Implementation**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts) with persistence in [src/app/api/chat/repository.ts](src/app/api/chat/repository.ts)

### `GET /api/models`
Returns available models from OpenRouter API filtered by availability

### `GET /api/conversations`
Fetches user's conversation history (requires auth), returns list of conversation metadata

### `GET /api/conversations/[id]`
Get conversation details

### `POST /api/conversations/[id]`
Delete a conversation

### `GET /api/conversations/[id]/messages`
Fetch all messages in a conversation (paginated or all)

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

## Supabase Schema

**`conversations` table:**
```
id              UUID primary key
user_id         UUID (foreign key to auth.users)
title           text (initially null, set on first assistant message)
created_at      timestamp with time zone
updated_at      timestamp with time zone
```

**`messages` table:**
```
id              UUID primary key
conversation_id UUID (foreign key to conversations)
role            text ('user' | 'assistant')
blocks          jsonb (array of ContentBlock objects)
created_at      timestamp with time zone
updated_at      timestamp with time zone
```

The `blocks` column stores the block-based message structure (content, attachments, research). This allows efficient querying of messages while supporting flexible content types.

## Streaming Architecture

The `/api/chat` endpoint implements Server-Sent Events (SSE) for real-time response streaming:

1. **Stream Format**: Each update is a JSON object on a single line prefixed with `data: `
2. **Event Types**:
   - `content` - Text chunks (final response, can span multiple events)
   - `thinking` - Model's reasoning process
   - `tool_call` - Function call initiated (brave_search, fetch_url)
   - `tool_progress` - Intermediate tool execution status
   - `tool_result` - Tool execution result
   - `conversation_created` / `conversation_updated` - DB sync events
3. **Client-Side**: `src/features/chat/lib/chat-client.ts` parses events and dispatches to `useChatStore`
4. **Tool Loop**: Server executes tools up to 20 iterations per request, collecting results before final response

**Key Implementation Details:**
- Tools only execute if their API keys are configured (e.g., BRAVE_API_KEY)
- Each tool execution updates the research block progressively
- Stream persists blocks to Supabase after completion (in `src/app/api/chat/repository.ts`)
- System prompt is in Chinese, instructing thorough search before answering

## Environment Variables

Required in `.env.local`:
- `OPENROUTER_API_KEY` - OpenRouter API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

Optional:
- `OPENROUTER_DEFAULT_MODEL` - Default LLM model
- `OPENROUTER_HTTP_REFERER` - HTTP referer header
- `OPENROUTER_X_TITLE` - App title for OpenRouter
- `BRAVE_API_KEY` - Enables web search tool (optional, fetch_url always available)

## Theme System & CSS Variables

**Theme Switching**: [src/features/theme/hooks/useTheme.ts](src/features/theme/hooks/useTheme.ts) manages dark/light mode toggled from the settings menu.

**CSS Variables** are defined in [src/app/globals.css](src/app/globals.css) using Tailwind v4 format. These are the source of truth for all colors and should be used instead of hardcoded colors:
- Foreground/background colors
- Text colors
- Border colors
- Accent colors

**Theme Initialization**: The root layout includes an in-head script that sets the theme before React hydrates to prevent flash of wrong theme.

## Development Notes

**Attachment Handling**: User-uploaded files are stored in `pendingAttachments` in `useChatStore` and included in the request to `/api/chat`. The server then formats them into ContentBlock structures for persistence.

**Message Rendering**: [src/features/chat/components/MessageItem.tsx](src/features/chat/components/MessageItem.tsx) renders messages based on their blocks. Each block type (content, attachments, research) has specialized rendering logic in subcomponents.

**Research Visibility**: The research/thinking process is progressively streamed and rendered by [src/features/chat/components/message/research/](src/features/chat/components/message/research/) components. Users can expand/collapse research sections.

**Conversation Loading**: New conversations start without a `conversationId` (`null`). For logged-in users, the client generates a UUID before the first message is sent and uses it as the conversation ID; the server returns a `conversation_created` event with that ID for persistence. Guests keep `conversationId: null` and their messages are only stored locally in the current session.

**Model Selection**: Available models are fetched on-demand from `/api/models` and cached in `useChatStore`. The `currentModel` must be set before sending a message.

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

**Entry & Layout:**
- Main entry: [src/app/page.tsx](src/app/page.tsx)
- Root layout: [src/app/layout.tsx](src/app/layout.tsx)
- Global styles: [src/app/globals.css](src/app/globals.css)

**Chat Feature:**
- Chat API: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- Chat persistence: [src/app/api/chat/repository.ts](src/app/api/chat/repository.ts)
- Chat components: [src/features/chat/components/](src/features/chat/components/)
- Chat store: [src/features/chat/store/useChatStore.ts](src/features/chat/store/useChatStore.ts)
- Chat types: [src/features/chat/types/chat.ts](src/features/chat/types/chat.ts)
- SSE client: [src/features/chat/lib/chat-client.ts](src/features/chat/lib/chat-client.ts)

**Other Features:**
- Conversation store: [src/features/sidebar/store/useConversationsStore.ts](src/features/sidebar/store/useConversationsStore.ts)
- Theme hook: [src/features/theme/hooks/useTheme.ts](src/features/theme/hooks/useTheme.ts)
- Auth hook: [src/features/auth/hooks/useAuth.ts](src/features/auth/hooks/useAuth.ts)

**Shared Utilities:**
- Supabase client: [src/shared/lib/supabase/client.ts](src/shared/lib/supabase/client.ts)
- Tools definition: [src/shared/lib/tools.ts](src/shared/lib/tools.ts)
- File utilities: [src/shared/utils/file.ts](src/shared/utils/file.ts)

## Developer Preferences

- Review code thoroughly before answering questions
- Use CSS variables from global.css for frontend styling
- Use plain, natural language (avoid jargon)
- Take time with implementation; be detailed
- Don't run pnpm unless necessary
