# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-24 - ISO-8601 Timestamp String Sorting Performance
**Learning:** For simple ISO timestamp strings (like `updated_at`), `String.prototype.localeCompare` is significantly slower than using standard lexical comparison operators (`<`, `>`). This causes a performance bottleneck when frequently rendering or sorting large collections, such as conversation histories.
**Action:** Always use simple lexical comparison logic (e.g., `a < b ? 1 : a > b ? -1 : 0`) instead of `localeCompare` when sorting lists of objects by ISO-8601 dates to improve sorting performance.
