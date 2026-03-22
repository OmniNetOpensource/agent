# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-24 - Scroll Listener Thrashing & React Compiler Limitations
**Learning:** Attaching native scroll event listeners in a `useEffect` that depends on frequently updating state (like `messages` during streaming) causes severe listener thrashing (constant detach/re-attach) which can degrade performance. Additionally, even with the React Compiler enabled, functions that generate new array/object references on every call (like `computeMessagesFromPath`) require explicit `useMemo` caching. Without this caching, any dependent effects will still thrash continuously on parent re-renders.
**Action:** Bind scroll listeners exactly once using an empty dependency array `[]`, add `{ passive: true }`, and use functional state updates (`setState(prev => ...)`). Extract position checks triggered by new messages into a separate `useEffect` dependent only on `messages.length`. Always use `useMemo` for derived arrays that generate new references despite React Compiler.
