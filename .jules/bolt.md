## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-05-21 - React Compiler vs Zustand Selectors
**Learning:** React Compiler (React 19) handles memoization within the component render phase, but it cannot prevent re-renders triggered by custom hooks (like Zustand selectors) returning new references.
**Action:** Continue using `useShallow` or granular selectors in Zustand to ensure the hook itself doesn't trigger unnecessary re-renders, as React Compiler only optimizes what happens *after* the render starts.
