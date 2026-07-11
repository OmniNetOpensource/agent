# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-25 - Date String Sorting Performance
**Learning:** Sorting ISO-8601 formatted date strings using  is significantly slower than using standard lexicographical comparison operators (`<`, `>`). For arrays with standard date formats, the overhead of localization checks is unnecessary.
**Action:** Use `a < b ? -1 : (a > b ? 1 : 0)` pattern when sorting ISO-8601 dates to achieve substantial performance gains without sacrificing correctness.
\n## 2026-02-25 - Date String Sorting Performance\n**Learning:** Sorting ISO-8601 formatted date strings using String.prototype.localeCompare is significantly slower than using standard lexicographical comparison operators (<, >). For arrays with standard date formats, the overhead of localization checks is unnecessary.\n**Action:** Use 'a < b ? -1 : (a > b ? 1 : 0)' pattern when sorting ISO-8601 dates to achieve substantial performance gains without sacrificing correctness.
