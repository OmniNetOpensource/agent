# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2023-10-27 - Optimize Conversation Store Performance
**Learning:** `localeCompare` introduces significant performance overhead for ISO-8601 string sorting because it invokes the Intl API. Furthermore, iterating over Maps by creating intermediate arrays (`Array.from(map.values())`) introduces unnecessary O(N) array allocation overhead, which is especially noticeable in state reducers handling large maps. Array concatenation (`[...a, ...b]`) is also slower than sequential `.find()` calls when searching for an element across multiple state properties.
**Action:** Use simple lexical string comparison operators (`<`, `>`) when sorting ISO-8601 dates to bypass Intl API overhead. Pass Iterables (`map.values()`) directly where applicable instead of allocating arrays. Use sequential `.find()` lookups with nullish coalescing (`a.find(...) ?? b.find(...)`) rather than concatenating arrays before searching.
