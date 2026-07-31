# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Lexical Date Sorting & Iterable Map Iteration
**Learning:** `localeCompare` is surprisingly slow for ISO-8601 date strings. Lexical comparison (`<`, `>`) is ~70x faster in V8. Additionally, converting `map.values()` to an array via `Array.from()` before passing to a processing function incurs an unnecessary O(N) memory allocation and iteration cost.
**Action:** Always use lexical comparison operators for ISO-8601 string sorting instead of `localeCompare`. Use `Iterable<T>` in function signatures that loop over collections to allow passing `map.values()` directly, saving memory and intermediate O(N) work.
