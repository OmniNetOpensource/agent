# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - localeCompare Performance Overhead
**Learning:** `String.prototype.localeCompare` relies on the Intl API and is significantly slower (often ~2x slower) than standard lexical comparison operators (`<`, `>`). For strings with strict weak ordering requirements like ISO-8601 formatted dates, `localeCompare` introduces unnecessary overhead.
**Action:** When sorting arrays of ISO-8601 date strings, replace `localeCompare` with simple lexical comparison (`b > a ? 1 : b < a ? -1 : 0`) to improve array sorting execution time.
