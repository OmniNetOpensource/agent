## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-05-22 - MessageItem Re-render Optimization
**Learning:** React.memo shallow comparison fails for props that are new objects on every render (like `branchInfo` computed in parent loop). This causes expensive re-renders for large lists.
**Action:** Implement a custom `arePropsEqual` function for `React.memo` to perform deep comparison on specific structural props while keeping shallow checks for others.
