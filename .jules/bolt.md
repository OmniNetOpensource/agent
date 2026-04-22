# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-05 - Effect Thrashing with Event Listeners
**Learning:** Re-binding DOM event listeners inside a `useEffect` that depends on frequently changing state (like streaming messages) creates overhead and jank. Additionally, omitting `{ passive: true }` on scroll listeners blocks smooth scrolling on the main thread.
**Action:** When tracking UI metrics like scroll position, bind the native event listener exactly once (`useEffect(..., [])`) with `{ passive: true }`. Update tracked state via functional setters (`setState(prev => ...)`). Use a separate `useEffect` dependent on the changing data to sync position when content updates.
