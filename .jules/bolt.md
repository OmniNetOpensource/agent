# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-08-31 - Lexical Comparison for ISO Dates\n**Learning:** Using `String.prototype.localeCompare` for sorting standardized ISO-8601 date strings introduces significant overhead due to Intl API processing. Benchmarks show lexical comparison (`>`, `<`) is roughly ~2x faster in Node.js while maintaining exactly the same sorting order for consistently formatted ISO dates.\n**Action:** Prefer basic lexical comparison operators over `localeCompare` when sorting standardized ISO timestamps or purely ASCII strings where complex internationalization rules are unnecessary.
