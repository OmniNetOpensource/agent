## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-20 - Component Isolation for Frequent Global State Changes
**Learning:** Even granular selectors cause re-renders if the selected value (e.g., `pending` status) changes frequently and affects many items.
**Action:** Extract parts of the component that depend on this volatile state into a separate leaf component (e.g., `MessageToolbar`), so the heavy parent (e.g., `MessageItem` with Markdown) remains memoized and static.
