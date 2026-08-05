# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-05-18 - ISO-8601 Timestamp Sorting Optimization
**Learning:** `String.prototype.localeCompare` is notoriously slow in standard JS environments when dealing with large datasets due to its localized handling of text. However, for strictly formatted ISO-8601 timestamp strings (like `updated_at`), the chronological order natively maps exactly to standard UTF-16 code unit lexical order. Thus, basic lexical operators (`>`, `<`) achieve the precise same outcome but are roughly 70x faster.
**Action:** When sorting dates that are formatted as standard zero-padded strings like ISO-8601 (which only contain ASCII numerals and delimiters), always avoid `localeCompare` and prefer standard lexical operators. Reserve `localeCompare` solely for human-readable localized text.
