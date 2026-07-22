# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2024-03-24 - [ISO-8601 Date String Sorting Optimization]
**Learning:** `String.prototype.localeCompare()` is notoriously slow in V8 when sorting large arrays of date strings because it applies complex, locale-specific collation rules. However, since ISO-8601 format date strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) are designed to be lexically sortable, standard string comparison operators (`<`, `>`) produce the exact same chronological sorting order but execute approximately 3x to 70x faster depending on the dataset.
**Action:** Always prefer lexical comparison (`<`, `>`) over `localeCompare` when sorting ISO-8601 timestamps (like `created_at`, `updated_at`, `pinned_at`) to optimize render and load times, especially for features like chat history or conversation lists where data sets can grow large.
