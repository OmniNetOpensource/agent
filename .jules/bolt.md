# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-05 - Lexical Comparison vs LocaleCompare for Timestamps
**Learning:** `String.prototype.localeCompare` is notoriously slow in V8 and other JavaScript engines because it relies on the browser's complex internationalization API. For ISO-8601 formatted date strings (like `2023-10-27T10:00:00Z`), basic lexical string comparison operations (`<` and `>`) yield the exact same sort order but are significantly faster (roughly 30%+ reduction in benchmark time for 10k items).
**Action:** Always prefer `<` and `>` operators over `localeCompare` when sorting ISO timestamp strings or simple alphanumeric strings where locale-specific collation is not required.
