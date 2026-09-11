# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2024-05-24 - Array Allocations & Date Sorting Optimizations
**Learning:** O(N) array allocations from spread syntax and intermediate `Array.from()` calls in performance-sensitive store operations can cause noticeable slowdowns, especially on large datasets. Additionally, `String.prototype.localeCompare` has high overhead when sorting ISO-8601 timestamps. Lexical comparison operators (`<`, `>`) are much faster (up to ~20-70x).
**Action:** When working with collections and `Map` objects, type function parameters as `Iterable<T>` and iterate directly with `for...of` instead of intermediate array conversion. For searching across multiple arrays, chain `find()` calls instead of concatenating arrays via spread syntax. For ISO-8601 date string sorting, use simple lexical comparison operators, explicitly handling equality (returning 0) to maintain strict weak ordering.
