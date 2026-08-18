# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-08-18 - Avoid Zustand Hooks for Event Handler State
**Learning:** Subscribing to global Zustand state (like `pending` for ongoing generations) using hooks inside a list item component (`ConversationItem`) causes every item in the list to re-render whenever that global state changes.
**Action:** When a piece of state is only needed inside an event handler (like an `onClick` confirmation dialog), do not subscribe to it via a hook. Instead, retrieve the current value imperatively using `store.getState()` inside the handler to completely avoid reactive re-renders.
