# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-09 - Scroll Listener Thrashing & Render Stability in Streaming Lists
**Learning:** Attaching native scroll listeners (via `addEventListener`) with a `[messages, isAtBottom]` dependency array causes severe thrashing and re-renders, especially when lists update frequently (like during text streaming). Furthermore, selecting non-stable derived actions or objects from Zustand in the list component can worsen the problem by triggering unnecessary full-list updates.
**Action:**
1. Use an empty dependency array `[]` for binding native scroll listeners with `{ passive: true }`.
2. Extract scroll position checks into a separate helper and call it from a dedicated `useEffect` dependent only on `[messages]` (or use functional state updates) to prevent listener tear-down/setup on every token.
3. Memoize computed arrays derived from Zustand state (`computeMessagesFromPath`), and avoid selecting actions that close over store state (like `getBranchInfo`). Instead, select the stable store state (`allMessages`) and manually run the helper function within the render loop or child components to maintain referential stability.
