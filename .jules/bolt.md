# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Avoid O(N) array allocation on Map processing
**Learning:** Calling `Array.from(map.values())` inside high-frequency processing pipelines (like `mergeConversations`) causes an unnecessary O(N) intermediate array allocation.
**Action:** Change helper functions (like `splitAndSortConversations`) to accept `Iterable<T>` instead of `T[]`, allowing you to pass `map.values()` directly.

## 2026-03-05 - Optimize string sorting by bypassing Intl
**Learning:** Using `String.prototype.localeCompare` to sort standardized string formats (like ISO 8601 dates) is extremely slow due to the overhead of the Intl API in standard JS engines.
**Action:** Use basic lexical string comparison operators (`<`, `>`) instead of `localeCompare` for sorting standardized date strings. Benchmarks show this can be 20-70x faster.

## 2026-03-05 - Safe in-place sorting for local arrays
**Learning:** Copying an array before sorting it via `[...arr].sort()` is redundant and causes O(N) allocation overhead if the array was freshly constructed immediately prior by the caller.
**Action:** Audit call sites to confirm if arrays are freshly instantiated. If they are, remove the spread operator and sort the parameter in-place safely without violating immutability principles.
