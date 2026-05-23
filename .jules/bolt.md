# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - React Compiler & External Selectors that generate new references
**Learning:** Even with React Compiler enabled, functions imported from external libraries (like `computeMessagesFromPath`) that return new array references on every call will still cause their enclosing component to continuously re-evaluate downstream hooks (like `useEffect`) if those hooks depend on the return value. The compiler does not magically memoize the return of opaque, external functions.
**Action:** Always explicitly wrap calls to such reference-generating external functions in `useMemo` when their result is used in dependency arrays, or use `useShallow` if selecting from Zustand stores, to prevent effect thrashing (e.g., re-binding DOM event listeners).
