# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, GPT-based tools, etc.) when working with code in this repository.

## Project Overview

**Aether** is an AI chat application built with Next.js that provides a conversational interface with:

- Multi-model LLM support via OpenRouter (model picker persisted in localStorage)
- Streaming SSE responses with thinking/tool progress
- Tools for web search and URL fetching (brave_search, fetch_url)
- Message attachments (image, video, audio, file) serialized to base64 for requests
- Local-first persistence in IndexedDB (message tree, pinned conversations)
- Message editing, retry, and branching with branch navigation
- Code preview panel for HTML/CSS/JS code blocks
- Theme toggle and mobile layout detection

## Common Development Commands

```bash
pnpm dev           # Start development server (http://localhost:3000)
pnpm build         # Production build
pnpm start         # Start production server
pnpm type-check    # TypeScript validation (no emit)
pnpm lint          # ESLint check
pnpm check         # Full validation: type-check + lint + build
```

## Architecture & Structure

### App Routes (`src/app/`)

- `api/chat` - Streaming chat endpoint (OpenRouter + tools)
- `api/dashboard/stats` - Local-only stats
- `api/sync` - Disabled (returns 501)
- `page.tsx` - Root redirect to `/app`
- `app/page.tsx` - New chat screen
- `app/c/[conversationId]/page.tsx` - Conversation screen
- `app/layout.tsx` - App shell with Sidebar + top bar
- `dashboard/page.tsx` - Local stats screen

### Feature Folders (`src/features/`)

- `chat/` - Chat UI, state, and request flow
  - `components/` - Composer, MessageList, MessageItem, MessageEditor, BranchNavigator
  - `hooks/` - Conversation loader, system prompt presets
  - `lib/` - chat-client, chat-request, message-tree, block-operations, serialization, model-config
  - `store/` - `useChatStore`
- `sidebar/` - Conversation list with pin/unpin + delete
- `preview/` - Code preview panel + `usePreviewStore`
- `dashboard/` - Local stats + sync UI
- `theme/` - Theme switching hook

### Shared (`src/shared/`)

- `components/` - Markdown, CodeBlock, ImagePreview
- `lib/tools/` + `lib/tools.ts` - Tool specs and dispatcher
- `lib/openrouter/` - OpenRouter streaming helpers
- `lib/indexed-db/` - Local IndexedDB persistence
- `lib/conversation-logger.ts` - Dev logs to `logs/conversations`
- `mobile/`, `toast/`, `utils/`

### Root-level

- `components/ui/` - shadcn + Radix UI primitives
- `lib/utils.ts` - `cn` helper

## Data Model & Message Blocks

- `types/conversation.ts` - `Conversation`, `DbMessage`
- `src/features/chat/types/chat.ts` - `ContentBlock`, `Attachment`, `ResearchItem`, `Message`, `MessageTree`, `EditingState`

```typescript
ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[] }
  | { type: "error"; message: string }

ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; data: { call; progress?; result? } }
```

Message branching is stored in `MessageTree` (nodes + rootIds + currentPath).

## State Management (Zustand)

**`useChatStore`**
- `messageTree` is the source of truth; `messages` are derived from the current path
- Tracks `editingState`, `activeRequestId`, `pending`, `chatClient`, `currentModel`
- `searchEnabled` + `systemInstruction` control tool usage and system prompt
- Handles attachments (`pendingAttachments`, `uploading`)
- Actions include `sendMessage`, `appendToAssistant`, `stop`, `startEditing`, `submitEdit`, `retryFromMessage`, `branchToNewConversation`, `navigateBranch`

**`useConversationsStore`**
- Splits `pinnedConversations` and `normalConversations`
- Loads from IndexedDB and supports pin/unpin, delete, and clear

**`usePreviewStore`**
- Drives the code preview panel (open/close/reset)

## Chat API + Streaming

**`POST /api/chat`**
- Builds the system prompt with local date/time and optional user instruction
- Streams OpenRouter responses via SSE and loops tool calls (max 20 iterations)
- Preserves `reasoning_details` for Gemini models
- Emits `content`, `thinking`, `tool_call`, `tool_progress`, `tool_result`, `error`, `conversation_created`, `conversation_updated`
- Writes dev logs to `logs/conversations` via `conversation-logger`

**`GET /api/dashboard/stats`** returns local-only stats. **`POST /api/sync`** returns 501.

## Persistence

- IndexedDB (`localDB`) stores conversations with `messageTree`, pinned state, and legacy `messages`
- localStorage keys: `selected-model`, `search-enabled`, `system-prompts`, `selected-prompt-id`, `theme`

## Environment Variables

Required in `.env.local`:
- `OPENROUTER_API_KEY`

Optional:
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_X_TITLE`
- `BRAVE_API_KEY` (enables `brave_search`)

## Tools Available During Chat

1. **brave_search**
   - Input: `{ query: string }`
   - Only enabled when `BRAVE_API_KEY` is set

2. **fetch_url**
   - Input: `{ url: string }`
   - Tries Jina Reader first, falls back to direct fetch + text cleanup
   - Emits `tool_progress` updates during download/parse

## File Locations Reference

- Chat API: `src/app/api/chat/route.ts`
- System prompt + message conversion: `src/app/api/chat/utils.ts`
- Message tree logic: `src/features/chat/lib/message-tree.ts`
- Chat request orchestration: `src/features/chat/lib/chat-request.ts`
- Chat UI: `src/features/chat/components/`
- Message rendering: `src/features/chat/components/message/MessageItem.tsx`
- Composer + toolbar: `src/features/chat/components/composer/Composer.tsx`
- System prompt UI: `src/features/chat/components/composer/SystemPromptPopover.tsx`
- Model configs: `src/features/chat/lib/model-config.ts`
- Preview panel: `src/features/preview/components/PreviewPanel.tsx`
- Code block preview: `src/shared/components/CodeBlock.tsx`
- Local DB: `src/shared/lib/indexed-db/conversations.ts`
- Tools: `src/shared/lib/tools.ts`

## Developer Preferences

- Review the project thoroughly before answering questions
- Use CSS variables from global.css for frontend styling
- Use plain, natural language (avoid jargon)
- Take time with implementation; be detailed
- frontend style need to fit in the current project's style
- be flexible
- Do not use `useCallback` or `useMemo`
