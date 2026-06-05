# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-06-05 - MessageList Effect Optimization
**Learning:** In components rendering lists of items that change frequently (like streaming messages), binding native scroll event listeners repeatedly on state changes (e.g. `[messages, isAtBottom]`) causes listener thrashing. Separately, `useMemo` is still required for array-generating functions like `computeMessagesFromPath` even with React 19's compiler.
**Action:** Use functional state updates to remove the need for state variables in event listener dependencies. Memoize array computations explicitly. Reverting changes that tie cleanup effects directly to object references (like `[messages]`) instead of primitives (like `[messages.length]`) avoids severe regressions during streaming text updates.
