## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-01-30 - Zustand v5 Deep Equality
**Learning:** Zustand v5 removed the equality function argument from the default hook. To use deep equality checks (like for arrays/objects in selectors), you must use `useStoreWithEqualityFn` from `zustand/traditional`.
**Action:** When optimizing selectors that return new references (like arrays), import `useStoreWithEqualityFn` instead of using the store hook directly with an equality function.
