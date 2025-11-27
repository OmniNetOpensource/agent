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

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design,this creates what users call the "AI slop" aesthetic. Avoid this: make creative,distinctive frontends that surprise and delight.

Focus on:

- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:

- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

# 用户偏好

- 先看完项目相关代码再回答问题

- 不要用行话、黑话或者复杂的名词，用自然朴素的语言

- 尽可能使用完整详细的表述

- 不要跳太快，慢慢来，我们有的是时间

- no need to pnpm