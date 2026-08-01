# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-08-01 - Memoizing Derived Arrays in List Items
**Learning:** Extracting and splitting derived array data (like message blocks into content and attachment blocks) directly inside frequently re-rendered list item components (`MessageItem`) using multiple `.filter()` passes causes unnecessary O(N) iteration and new array allocations on every render cycle, even when the underlying data (`message.blocks`) hasn't changed.
**Action:** Use `useMemo` combined with a single-pass `reduce` (or loop) to calculate split array data inside list items. This scales better linearly and minimizes unnecessary array allocations and re-evaluations across heavy render updates (such as during streaming).
