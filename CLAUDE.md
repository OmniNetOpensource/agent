# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Aether** is an AI chat application built with Next.js that provides a conversational interface with:
- Multi-model LLM support via OpenRouter (model picker persisted in localStorage)
- Streaming SSE responses with thinking/tool progress
- Tools for web search and URL fetching (tavily_search, fetch_url)
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
- `systemInstruction` controls system prompt
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
   - `tool_call` - Function call initiated (tavily_search, fetch_url)
   - `tool_progress` - Tool execution progress (stage/message/bytes)
   - `tool_result` - Tool execution result
   - `conversation_created` / `conversation_updated` - Local persistence events
   - `error` - Error messages
3. **Client-Side**: `src/features/chat/lib/chat-client.ts` parses events and dispatches to `useChatStore`
4. **Tool Loop**: Server executes tools up to 20 iterations per request, collecting results before final response

## Persistence

- IndexedDB (`localDB`) stores conversations with `messageTree`, pinned state, and legacy `messages`
- localStorage keys: `selected-model`, `system-prompts`, `selected-prompt-id`, `theme`

## Environment Variables

Required in `.env.local`:
- `OPENROUTER_API_KEY` - OpenRouter API key

Optional:
- `OPENROUTER_HTTP_REFERER` - HTTP referer header
- `OPENROUTER_X_TITLE` - App title for OpenRouter
- `TAVILY_API_KEY` - Enables web search tool (`fetch_url` always available)

## Theme System & CSS Variables

**Theme Switching**: `src/features/theme/hooks/useTheme.ts` manages dark/light mode toggled from the settings menu. Theme selection is stored in localStorage and mirrored to a cookie for server render.

**CSS Variables** are defined in `src/app/globals.css` (Tailwind v4 format). These are the source of truth for all colors and should be used instead of hardcoded colors.

**Theme Initialization**: The root layout includes an in-head script that sets the theme before React hydrates to prevent flash of wrong theme.

## Development Notes

**Attachment Handling**: User-uploaded files live in `pendingAttachments` and are serialized to base64 for `/api/chat` via `serialization.ts`.

**Message Editing + Branching**: `messageTree` supports edits, retries, and branching. UI lives in `MessageEditor` and `BranchNavigator`.

**System Prompts**: Presets are stored in localStorage via `useSystemPrompts` and set `systemInstruction` on `useChatStore`.

**Model Selection**: Values are stored in localStorage in `ComposerToolbar`.

**Code Preview**: `CodeBlock` can open HTML/CSS/JS in `PreviewPanel`.

**Conversation Logging**: `/api/chat` logs to `logs/conversations` in non-production.

## Tools Available During Chat

Tools are defined in `src/shared/lib/tools.ts` and sent to OpenRouter as function definitions:

1. **tavily_search** - Query web search
   - Input: `{ query: string }`
   - Returns: Search results
   - Only enabled when `TAVILY_API_KEY` is configured

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



<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output CLAUDE.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
