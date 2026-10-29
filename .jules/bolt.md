# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-10-29 - Iterating Map Values with Iterables
**Learning:** Iterating directly over `map.values()` using an `Iterable` parameter instead of creating an intermediate array with `Array.from(map.values())` prevents O(N) memory allocation and garbage collection overhead, making the operation significantly faster (e.g., ~2.3x faster for large datasets).
**Action:** Use `Iterable<T>` for function parameters that process Map values and pass `map.values()` directly when array-specific methods (like `.map()` or `.filter()`) aren't needed.

## 2026-10-29 - Array Concatenation Overhead for Searching
**Learning:** Creating an intermediate array to search across multiple lists (e.g., `[...listA, ...listB].find(...)`) incurs O(N) memory allocation and garbage collection overhead, especially during frequent updates.
**Action:** Use sequential `.find()` calls with the nullish coalescing operator (e.g., `listA.find(...) ?? listB.find(...)`) to avoid concatenation and benefit from short-circuiting when the item is found early.
