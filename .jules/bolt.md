# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Effect Thrashing and Array References in Lists
**Learning:** Functions that generate new array references on every call (like `computeMessagesFromPath` using `.map().filter()`) will break `useEffect` dependencies and React memoization when used directly in the render body. This can cause severe performance issues like continuously unbinding and rebinding event listeners (e.g., scroll listeners) during rapid state updates like text streaming.
**Action:** Always wrap computationally derived array references in `useMemo` when they are passed as dependencies to `useEffect` or to memoized child components. Additionally, for event listener registration in effects, prefer empty dependency arrays `[]` and utilize functional state updates (e.g., `setState(prev => ...)`) to avoid capturing stale closures and listener thrashing. Use `{ passive: true }` for scroll event listeners to prevent UI jank.
