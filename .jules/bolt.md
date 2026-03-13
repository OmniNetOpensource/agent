# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-24 - React Compiler and Reference Equality
**Learning:** The React Compiler (React 19) is enabled, which eliminates the need for many `useMemo` calls. However, functions that return a *new array reference on every invocation* (like `computeMessagesFromPath` which filters/maps) still require manual memoization (`useMemo`) when their results are passed down to child components or used in `useEffect` dependency arrays, otherwise they trigger constant re-renders and effect thrashing.
**Action:** Always wrap the output of purely functional utilities that construct new arrays/objects in `useMemo` when they depend on stable state but are called during the render phase.

## 2026-02-24 - Scroll Listener Thrashing During Streaming
**Learning:** Binding scroll event listeners inside a `useEffect` that depends on frequently updating state (like `messages` during an AI stream) causes the listener to be constantly removed and re-added. This leads to severe jank and performance degradation as the DOM is continuously manipulated.
**Action:** Bind scroll listeners exactly once using an empty dependency array `[]`. Use functional state updates (`setState(prev => ...)`) to avoid stale closures, and add a separate, minimal `useEffect` to handle position checks triggered by distinct state changes (like `messages.length` instead of the full `messages` array). Always use `{ passive: true }` for scroll listeners.