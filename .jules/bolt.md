## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-09 - Stable Selectors for Derived State
**Learning:** `useShallow` compares properties shallowly. If a selector returns an object with nested array references (like `siblingIds` in `BranchInfo`), `useShallow` fails to memoize, causing re-renders.
**Action:** Select only necessary primitives (e.g., `{ currentIndex, total }`) in the selector when possible, or use a custom equality function if deep comparison is needed.
