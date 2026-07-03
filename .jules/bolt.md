# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-05-14 - Mutable Sorting Risk in React State Stores
**Learning:** Optimizing performance by removing `[...arr].sort()` cloning inside utility functions (like `sortByPinnedAt`) is highly dangerous in a Zustand/React state store. Because `sort()` mutates in-place, removing the clone causes direct mutation of state objects or function arguments, violating immutability and risking reactivity bugs (skipped re-renders). The micro-performance gain of avoiding an array allocation is never worth the risk of breaking state immutability.
**Action:** When optimizing sorting functions in React or state-management environments, ALWAYS retain the defensive `[...arr]` clone unless you can prove with 100% certainty that the incoming array is a fresh, isolated reference that is safe to mutate. Prioritize state immutability over micro-allocations.
