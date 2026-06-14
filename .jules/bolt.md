# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-06-14 - [Preventing Listener Thrashing in Streaming Chat UI]
**Learning:** In React components observing streaming arrays like messages, binding native event listeners inside useEffect with the array as a dependency causes aggressive listener thrashing (removing/re-adding) on every token update. Additionally, functions like computeMessagesFromPath that return new arrays defeat React Compiler's automatic memoization, propagating thrashing to dependent effects.
**Action:** Wrap custom selectors returning new references in useMemo. For scroll tracking, bind native listeners exactly once ([] deps) using { passive: true } and functional state updates. Handle content-driven height changes in a separate, isolated effect.
