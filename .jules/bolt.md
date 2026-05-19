# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-01 - Zustand List Selectors cause Re-renders
**Learning:** `useConversationsStore((state) => state.pinnedConversations)` will cause the list component to re-render whenever *any* conversation in the array changes, even if it is not pinned or normal. And if a single conversation updates its title/timestamp, a new array is generated, causing the whole list component to re-render.
**Action:** Use `useShallow` from `zustand/react/shallow` to wrap the selector, allowing Zustand to perform a shallow comparison of the array elements before deciding to re-render the list component.
