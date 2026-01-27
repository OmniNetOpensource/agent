# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Note**: ESLint uses Next.js core-web-vitals + TypeScript configs with react-hooks recommended rules. TypeScript runs in strict mode.

## Architecture & Structure

### App Routes (`src/app/`)
- `api/chat` - Streaming chat endpoint (OpenRouter + tools)
- `page.tsx` - Root redirect to `/app`
- `app/page.tsx` - New chat screen
- `app/c/[conversationId]/page.tsx` - Conversation screen
- `app/layout.tsx` - App shell with Sidebar + top bar

### Feature Folders (`src/features/`)
- `chat/` - Chat UI, state, and request flow
  - `components/` - Composer, MessageList, MessageItem, MessageEditor, BranchNavigator
  - `hooks/` - Conversation loader, system prompt presets
  - `lib/` - chat-client, chat-request, message-tree, block-operations, serialization, model-config
  - `store/` - `useChatStore`
- `sidebar/` - Conversation list with pin/unpin + delete
- `preview/` - Code preview panel + `usePreviewStore`
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

### Key Type System

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

## API Routes

### `POST /api/chat`
Core chat endpoint that:
1. Builds the system prompt with local date/time and optional user instruction
2. Streams OpenRouter responses via SSE and loops tool calls (max 20 iterations)
3. Preserves `reasoning_details` for Gemini models
4. Emits `content`, `thinking`, `tool_call`, `tool_progress`, `tool_result`, `error`, `conversation_created`, `conversation_updated`
5. Writes dev logs to `logs/conversations` via `conversation-logger`

## Streaming Architecture

The `/api/chat` endpoint implements Server-Sent Events (SSE) for real-time response streaming:

1. **Stream Format**: Each update is a JSON object on a single line prefixed with `data: `
2. **Event Types**:
   - `content` - Text chunks (final response, can span multiple events)
   - `thinking` - Model reasoning stream
   - `tool_call` - Function call initiated (brave_search, fetch_url)
   - `tool_progress` - Tool execution progress (stage/message/bytes)
   - `tool_result` - Tool execution result
   - `conversation_created` / `conversation_updated` - Local persistence events
   - `error` - Error messages
3. **Client-Side**: `src/features/chat/lib/chat-client.ts` parses events and dispatches to `useChatStore`
4. **Tool Loop**: Server executes tools up to 20 iterations per request, collecting results before final response

## Persistence

- IndexedDB (`localDB`) stores conversations with `messageTree`, pinned state, and legacy `messages`
- localStorage keys: `selected-model`, `search-enabled`, `system-prompts`, `selected-prompt-id`, `theme`

## Environment Variables

Required in `.env.local`:
- `OPENROUTER_API_KEY` - OpenRouter API key

Optional:
- `OPENROUTER_HTTP_REFERER` - HTTP referer header
- `OPENROUTER_X_TITLE` - App title for OpenRouter
- `BRAVE_API_KEY` - Enables web search tool (`fetch_url` always available)

## Theme System & CSS Variables

**Theme Switching**: `src/features/theme/hooks/useTheme.ts` manages dark/light mode toggled from the settings menu. Theme selection is stored in localStorage and mirrored to a cookie for server render.

**CSS Variables** are defined in `src/app/globals.css` (Tailwind v4 format). These are the source of truth for all colors and should be used instead of hardcoded colors.

**Theme Initialization**: The root layout includes an in-head script that sets the theme before React hydrates to prevent flash of wrong theme.

## Development Notes

**Attachment Handling**: User-uploaded files live in `pendingAttachments` and are serialized to base64 for `/api/chat` via `serialization.ts`.

**Message Editing + Branching**: `messageTree` supports edits, retries, and branching. UI lives in `MessageEditor` and `BranchNavigator`.

**System Prompts**: Presets are stored in localStorage via `useSystemPrompts` and set `systemInstruction` on `useChatStore`.

**Model Selection + Search Toggle**: Values are stored in localStorage in `ComposerToolbar`.

**Code Preview**: `CodeBlock` can open HTML/CSS/JS in `PreviewPanel`.

**Conversation Logging**: `/api/chat` logs to `logs/conversations` in non-production.

## Tools Available During Chat

Tools are defined in `src/shared/lib/tools.ts` and sent to OpenRouter as function definitions:

1. **brave_search** - Query web search
   - Input: `{ query: string }`
   - Returns: Search results
   - Only enabled when `BRAVE_API_KEY` is configured

2. **fetch_url** - Fetch and parse URL content
   - Input: `{ url: string }`
   - Returns: Plain text content (tries Jina Reader first, then direct fetch)

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
- shadcn/ui + Radix UI primitives
- Lucide React for icons
- Framer Motion for animations
- React Markdown, KaTeX, highlight.js for message rendering

## File Locations Reference

**Entry & Layout:**
- Root redirect: `src/app/page.tsx`
- Main chat page: `src/app/app/page.tsx`
- Conversation page: `src/app/app/c/[conversationId]/page.tsx`
- App layout (Sidebar + Header): `src/app/app/layout.tsx`
- Root layout: `src/app/layout.tsx`
- Global styles: `src/app/globals.css`

**Chat Feature:**
- Chat API: `src/app/api/chat/route.ts`
- System prompt + message conversion: `src/app/api/chat/utils.ts`
- Chat components: `src/features/chat/components/`
- Chat store: `src/features/chat/store/useChatStore.ts`
- Chat types: `src/features/chat/types/chat.ts`
- Message tree: `src/features/chat/lib/message-tree.ts`
- Chat request: `src/features/chat/lib/chat-request.ts`
- SSE client: `src/features/chat/lib/chat-client.ts`

**Other Features:**
- Conversation store: `src/features/sidebar/store/useConversationsStore.ts`
- Theme hook: `src/features/theme/hooks/useTheme.ts`
- Preview panel: `src/features/preview/components/PreviewPanel.tsx`

**Shared Utilities:**
- Tools definition: `src/shared/lib/tools.ts`
- Tool implementations: `src/shared/lib/tools/`
- OpenRouter streaming: `src/shared/lib/openrouter/server.ts`
- Local IndexedDB store: `src/shared/lib/indexed-db/`
- Conversation logger: `src/shared/lib/conversation-logger.ts`
- Code block UI: `src/shared/components/CodeBlock.tsx`
- File utilities: `src/shared/utils/file.ts`

## Developer Preferences

- Review code thoroughly before answering questions
- Use CSS variables from global.css for frontend styling
- Use plain, natural language (avoid jargon)
- Take time with implementation; be detailed
- Don't run pnpm unless necessary
- Do not use `useCallback` or `useMemo`

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

