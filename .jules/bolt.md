# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2023-10-27 - Fast string sorting for ISO-8601
**Learning:** `String.prototype.localeCompare` is notoriously slow in JavaScript because it invokes the Intl API. For ISO-8601 formatted date strings (e.g., timestamps like `updated_at`), which naturally sort chronologically based on UTF-16 code units, using basic lexical string comparison operators (`<`, `>`) is significantly faster and achieves the exact same result.
**Action:** Always replace `localeCompare` with lexical operators when sorting ISO-8601 date strings to avoid the overhead of the Intl API.
