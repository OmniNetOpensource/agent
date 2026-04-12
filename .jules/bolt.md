# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Scroll Listener Thrashing During High-Frequency Updates
**Learning:** Binding scroll event listeners inside `useEffect` with rapidly changing dependencies (like a derived `messages` array during SSE streaming) causes severe listener thrashing. The constant unbinding and rebinding creates UI jank and memory pressure.
**Action:** Always bind list scroll listeners exactly once using an empty dependency array `[]` and `{ passive: true }`. Use functional state updates (e.g., `setState(prev => prev !== newValue ? newValue : prev)`) inside the handler to access the latest state without adding state variables to the dependency array. Handle programmatic scroll checks (like new messages arriving) in a separate, focused `useEffect`.
