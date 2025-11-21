# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js 16 routes, layouts, API (e.g. `app/api/chat/route.ts`).
- `components/`: Reusable UI and chat components.
- `hooks/`: React hooks (e.g. `useChat`, `useTheme`).
- `lib/`: Core logic such as tools integration.
- `store/`: Zustand stores (e.g. `useChatStore`).
- `types/`: Shared TypeScript types.
- `utils/`: Small helpers (formatting, storage, classnames).
- `public/`: Static assets; `.next/` is build output and ignored.

## Build, Test, and Development Commands

- `pnpm dev`: Start the development server on port 3000.
- `pnpm build`: Production build; should be clean before merging.
- `pnpm start`: Run the built app locally.
- `pnpm type-check`: TypeScript type checking only.
- `pnpm lint`: Run ESLint (`eslint-config-next` core-web-vitals).
- `pnpm check`: Run type-check, lint, and build; preferred pre-push command.

## Coding Style & Naming Conventions

- Language: TypeScript + React functional components.
- Use 2-space indentation and Prettier/VS Code defaults.
- Components: PascalCase (`ChatPageClient.tsx`, `ResearchBlock.tsx`).
- Hooks: `useX` naming in `hooks/` (`useChat.ts`, `useTheme.ts`).
- Zustand stores: `useSomethingStore` in `store/`.
- Keep modules focused; prefer small utilities in `utils/`.

## Testing Guidelines

- No dedicated test runner is configured yet; rely on `pnpm type-check` and `pnpm lint` as the baseline.
- When adding tests, discuss the proposed framework in the PR and co-locate tests near the code or in a `__tests__` folder.
- Include manual verification steps (inputs, expected UI/behavior) in your PR description.

## Commit & Pull Request Guidelines

- Commit messages: short, imperative English (e.g. `update sidebar toggle`, `add research block UI`).
- Group related changes; avoid large unrelated refactors.
- PRs should include: clear summary, motivation, screenshots for UI changes, environment assumptions (`.env.local` keys), and how you tested (`pnpm check`, manual steps).
- Link related issues if applicable and call out breaking changes explicitly.

## Environment & Security Tips

- Store API keys (e.g. `OPENROUTER_API_KEY`, `BRAVE_API_KEY`) only in `.env.local`; never commit secrets.

# 用户偏好

- 先看完项目相关代码再回答问题

- 不要用行话、黑话或者复杂的名词，用自然朴素的语言

- 尽可能使用完整详细的表述

- 不要跳太快，慢慢来，我们有的是时间
