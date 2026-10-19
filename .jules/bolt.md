# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - localeCompare Overhead for ISO Dates
**Learning:** Using `String.prototype.localeCompare` to sort ISO-8601 formatted date strings is computationally expensive because it invokes the Intl API.
**Action:** When sorting standard ISO-8601 strings (which are designed to be lexically sortable), always use basic lexical operators (`<`, `>`, `===`) to achieve significantly faster sorting performance. Ensure equality `0` is handled to maintain strict weak ordering.
