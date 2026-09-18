# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2024-05-19 - [Optimize Date Sorting & Avoid O(N) Array Allocation in useConversationsStore]
**Learning:** `String.prototype.localeCompare` is significantly slower than lexical operators (`<`, `>`) for ISO-8601 strings and incurs Intl API overhead. Converting Map values to Array before iterating adds an unnecessary O(N) array allocation overhead. Concatenating arrays using the spread operator for searching incurs O(N) allocation and performance overhead compared to sequential find.
**Action:** Always prefer lexical operators with strict equality checks for ISO-8601 string sorting. Direct iteration of `map.values()` via `Iterable` avoids unnecessary intermediate array creation. Use sequential find instead of spread array concatenation for searches across arrays.
