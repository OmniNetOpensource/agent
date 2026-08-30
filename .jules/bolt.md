# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - String Comparison Overhead and Iterable iteration
**Learning:** For sorting standard ISO-8601 formatted date strings like `updated_at`, using `String.prototype.localeCompare` incurs significant overhead compared to simple lexical comparison operators (`<`, `>`). Benchmarks show lexical comparison is ~20-30% faster in Standard Node/V8 environments in this app. Also, avoiding `Array.from(map.values())` and passing the Iterable directly to a `for...of` loop avoids unnecessary O(N) allocation and speeds up map value processing.
**Action:** Use standard lexical operators (`<`, `>`) instead of `localeCompare` when sorting ISO-8601 date strings. When processing Map values, type function parameters as `Iterable<T>` instead of `T[]` and pass `map.values()` directly.
