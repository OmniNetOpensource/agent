## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-15 - Leaf Component Subscription for Global State
**Learning:** Even with granular selectors, subscribing to rapidly changing global state (like `isStreaming` or `pending`) in a large list item component causes the entire item to re-render.
**Action:** Move the subscription into a small, memoized leaf component (e.g., `MessageActions`) so only that tiny part re-renders, leaving the heavy content (Markdown) untouched.
