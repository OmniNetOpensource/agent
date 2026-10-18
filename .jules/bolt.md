# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - String.localeCompare Performance Overhead
**Learning:** For simple sorting of standardized string formats (like ISO-8601 timestamps), `String.prototype.localeCompare` is significantly slower than basic lexical operators (`<`, `>`) due to the overhead of the Intl API. Benchmarks show lexical comparison is ~1.6x - 2.5x faster in V8.
**Action:** When sorting ISO-8601 timestamps or simple alphanumeric identifiers in performance-critical code, replace `localeCompare` with lexical operators, ensuring you explicitly handle the equality case (returning `0`) for strict weak ordering.

## 2026-03-02 - Avoiding O(N) Array Allocations with Iterables and Sequential Finds
**Learning:** Passing `map.values()` through `Array.from()` creates unnecessary intermediate arrays, forcing O(N) memory allocation and garbage collection. Similarly, concatenating arrays (`[...arr1, ...arr2]`) just to perform a lookup (`.find()`) incurs an O(N) allocation penalty compared to sequential search (`arr1.find() ?? arr2.find()`).
**Action:** Use `Iterable<T>` parameter types to consume `map.values()` directly. Replace array spread concatenation with sequential evaluation operators (`??` or `||`) for search operations across multiple arrays.
