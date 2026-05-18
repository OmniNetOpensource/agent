# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-05-18 - Zustand Selectors vs Pure Functions
**Learning:** While trying to optimize Zustand selectors in a component by directly importing pure utility functions (e.g., `getBranchInfo`), I learned that breaking the selector abstraction can cause critical bugs if the pure function expects different arguments (e.g., a 1-based index instead of an object) than what the selector abstracted away. Direct imports don't trigger re-renders, but store selectors are also stable references and don't trigger re-renders anyway unless the selected state changes.
**Action:** Avoid replacing Zustand selectors with direct utility imports unless you fully understand and account for the abstraction the selector provides. Zustand store actions/selectors are stable references and do not cause component re-renders themselves.
