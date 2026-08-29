# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-08-29 - [Avoid localeCompare, Array Concatenation, and Array.from on Maps]
**Learning:** In V8/Node environments, `String.prototype.localeCompare` has significant overhead for sorting standard ISO-8601 formatted date strings compared to basic lexical string comparison operators (`<`, `>`), which are ~20-70x faster. Additionally, concatenating arrays via spread operator (e.g., `[...a, ...b].find()`) and converting map values to arrays (`Array.from(map.values())`) introduces unnecessary O(N) allocation overhead. Passing iterables directly and using sequential `find` (e.g., `a.find() ?? b.find()`) is ~2-2.3x faster for large datasets.
**Action:** Use lexical string comparison (`<`, `>`) instead of `localeCompare` for standard date strings. Avoid intermediate array allocations by typing parameters as `Iterable<T>` to pass `map.values()` directly, and use sequential `.find()` instead of array concatenation when searching multiple arrays.
