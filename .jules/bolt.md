# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - LocaleCompare vs Lexical Operators for ISO Dates
**Learning:** `String.prototype.localeCompare` incurs significant overhead from the browser's Intl API when sorting arrays. For standard ISO 8601 date strings (where lexical order perfectly matches chronological order), basic lexical operators (`<`, `>`) are ~1.6x to 2.5x faster in V8 environments.
**Action:** Always replace `localeCompare` with strict weak ordering ternary expressions (`b > a ? 1 : b < a ? -1 : 0`) when sorting standardized timestamp strings.

## 2026-03-02 - Avoiding Array.from Allocation on Map Iterables
**Learning:** Calling `Array.from(map.values())` to pass map contents to an array-typed function creates an unnecessary O(N) memory allocation that can trigger GC pauses during rapid state updates (like streaming).
**Action:** Change utility function signatures to accept `Iterable<T>` instead of `T[]` whenever possible, allowing them to directly consume `map.values()` without intermediate allocation, which is ~2.3x faster for large datasets.
