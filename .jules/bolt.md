# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - O(N) Array Allocations in Iterables and Date Sorting Overhead
**Learning:** `String.prototype.localeCompare` on ISO date strings introduces massive CPU overhead due to the Intl API. Using standard lexical operators (`<`, `>`) is ~1.6-2.5x faster. Additionally, converting Maps or Iterables to arrays via `Array.from(map.values())` solely to pass them to functions that immediately iterate over them again introduces unnecessary O(N) memory allocation and garbage collection overhead.
**Action:** Use lexical operators for ISO string sorting where strict locale isn't required. Always type parameters as `Iterable<T>` rather than `T[]` when processing values from Maps/Sets to allow direct passing of iterators like `map.values()`, avoiding intermediate array creation.
