# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-10-26 - Optimized Date String Sorting
**Learning:** For sorting ISO-8601 formatted date strings (e.g., timestamps like updated_at), using basic lexical string comparison operators (<, >) is significantly faster than using String.prototype.localeCompare. It avoids the overhead of the Intl API and is ~1.6x to ~2.5x faster in standard Node/V8 environments.
**Action:** Replace String.prototype.localeCompare with lexical operators (<, >) for sorting ISO-8601 formatted date strings. Make sure to handle the equality case (returning 0) to satisfy strict weak ordering requirement.
