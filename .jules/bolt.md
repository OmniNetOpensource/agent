# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Lexical Comparison and Array Allocations
**Learning:** `String.prototype.localeCompare` is excessively slow (up to 70x slower) compared to lexical comparison (`<`, `>`) when sorting standard ASCII-only strings like ISO 8601 timestamps. Additionally, converting `Map.values()` to an array using `Array.from()` before iteration causes unnecessary O(N) memory allocation and processing overhead.
**Action:** Always use lexical operators (`<`, `>`) for sorting non-localized, format-strict strings (like IDs or ISO dates). Change function signatures from arrays (`T[]`) to iterables (`Iterable<T>`) when processing collections to allow passing `Map.values()` or `Set.values()` directly, preventing intermediate array allocations.
