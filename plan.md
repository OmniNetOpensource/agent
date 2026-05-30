1. **Optimize `sortByPinnedAt` and `sortByUpdatedAt` (In-place sort)**
   - In `src/features/sidebar/store/useConversationsStore.ts`, the functions `sortByPinnedAt` and `sortByUpdatedAt` currently create a shallow copy of the array using the spread operator (`[...conversations]`) before sorting.
   - However, the caller `splitAndSortConversations` already creates fresh arrays (`pinned` and `normal`) and passes them in.
   - I will modify `sortByPinnedAt` and `sortByUpdatedAt` to sort the array in-place, removing the redundant `[...conversations]` allocation to reduce memory overhead and garbage collection.

2. **Optimize Iteration in `splitAndSortConversations`**
   - The `mergeConversations` function converts a `Map`'s values into an array using `Array.from(map.values())` before passing it to `splitAndSortConversations`.
   - I will change `splitAndSortConversations` to accept an `Iterable<Conversation>` instead of `Conversation[]`, allowing it to consume `map.values()` directly via a `for...of` loop without an intermediate array allocation.
   - I will update `mergeConversations` to pass `map.values()` directly.

3. **Optimize Search in `updateConversationTitle`**
   - In `updateConversationTitle`, the code concatenates two potentially large arrays (`[...pinnedConversations, ...normalConversations]`) just to find a single conversation by ID.
   - I will replace this with sequential `find` calls: `pinnedConversations.find(c => c.id === id) ?? normalConversations.find(c => c.id === id)`, avoiding the O(N) array allocation.

4. **Verify changes**
   - I will run type checking, linting, and formatting to ensure the optimizations do not introduce any regressions and maintain project standards.

5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Request review and address PR comments as required before finalizing.

6. **Submit PR as Bolt**
   - I will submit a PR with the title "⚡ Bolt: [improvement]" and a description formatted according to Bolt's requirements.
