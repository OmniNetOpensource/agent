## 2024-05-18 - Avoid unnecessary array allocations from Map iterators in data processing
**Learning:** In hot loops like store update functions (e.g., `mergeConversations`), allocating an intermediate array with `Array.from(map.values())` before processing it introduces measurable O(N) allocation and garbage collection overhead.
**Action:** When filtering or transforming map contents, iterate over `map.values()` directly using a `for...of` loop or accept an `IterableIterator` in helper functions to avoid unnecessary array allocations.

## 2024-05-18 - In-place sorting of freshly created arrays
**Learning:** Spreading arrays (`[...arr].sort()`) before sorting is unnecessary and costly if the array was just created (e.g., as part of a filtering or extraction loop).
**Action:** Use in-place sorting (`arr.sort()`) without spreading when the array reference is guaranteed to be a fresh local copy, saving intermediate array allocation costs.
