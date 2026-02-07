## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-13 - Shallow Selectors with Derived State
**Learning:** `useShallow` only prevents re-renders if the top-level properties of the returned object are shallow-equal. If a selector calls a helper (like `getBranchInfo`) that returns a new object with new array references (e.g., `siblingIds`), `useShallow` will still trigger a re-render.
**Action:** When selecting derived state for list items, project only the primitive values needed (e.g., `{ currentIndex, total }`) inside the selector to ensure `useShallow` works effectively.
