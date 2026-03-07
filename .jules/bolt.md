# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-02-24 - Avoiding List Scroll Listener Thrashing
**Learning:** Attaching native scroll event listeners in `useEffect`s that depend on frequently updated state (like `messages` or `isAtBottom` toggles) causes expensive and unnecessary listener thrashing (removals and re-additions) which leads to poor performance and jank during fast updates like streaming. Additionally, native scroll events may not fire accurately when scrollable content *grows* without user interaction.
**Action:** Use functional state updates (e.g., `setState(prev => ...)`), `useMemo` for derived lists, and empty dependency arrays `[]` to bind scroll listeners exactly once. Use a `ResizeObserver` on the scroll container's inner content to reliably detect growth-based scroll position changes.
