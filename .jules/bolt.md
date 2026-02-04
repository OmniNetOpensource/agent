## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-19 - Isolating Global State Subscriptions in List Items
**Learning:** Even with granular selectors, if a list item subscribes to a frequently changing global state (like `pending` status), the entire item re-renders.
**Action:** Extract components that need the global state (like toolbars or buttons) into separate sub-components so the main list item (and its expensive content) remains static and memoized.
