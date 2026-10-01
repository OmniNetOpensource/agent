# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-04-18 - Avoiding O(N) Array Operations in React and Stores
**Learning:** Using array spread for concatenation before a `find` (e.g., `[...a, ...b].find()`) or spreading and reversing before a search (e.g., `[...arr].reverse().find()`) forces the JavaScript engine to allocate a new array of size N and iterate over it. In a React client component or a frequently updated Zustand store, this causes unnecessary memory pressure and garbage collection overhead on every render/update, even if the array lengths are modest.
**Action:** Replace `[...a, ...b].find()` with sequential searches (`a.find() ?? b.find()`). Replace `[...arr].reverse().find()` with a backward `for` loop (`for (let i = arr.length - 1; i >= 0; i--)`). This maintains readability while achieving O(1) space complexity and early-exit O(N) time complexity.
