# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-07-01 - [Replace localeCompare with lexical comparison for ISO-8601 strings]
**Learning:** String.prototype.localeCompare is ~70x slower in V8/JS engines compared to standard lexical relational operators (<, >). For predictable ASCII string structures like ISO-8601 formatted timestamps, relational operators produce the exact same sorting output while offering a massive performance improvement.
**Action:** Always prefer basic lexical operators for sorting dates stored as standard ISO strings, especially when sorting large arrays. Add explicit comments explaining the optimization so subsequent developers understand why localeCompare was avoided.
