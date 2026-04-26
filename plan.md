1. **Optimize array allocation in `updateConversationTitle`**
   - Update `src/features/sidebar/store/useConversationsStore.ts`. Replace the array concatenation `[...pinnedConversations, ...normalConversations]` with sequential `.find()` calls: `pinnedConversations.find(...) ?? normalConversations.find(...)`. This avoids O(N) allocation.

2. **Optimize map iteration in `mergeConversations` and `splitAndSortConversations`**
   - In `src/features/sidebar/store/useConversationsStore.ts`, change `splitAndSortConversations` to accept `Iterable<Conversation>` instead of `Conversation[]`.
   - Update `mergeConversations` to pass `map.values()` directly to `splitAndSortConversations`, skipping the intermediate array allocation from `Array.from(map.values())`.

3. **Optimize sorting to be in-place**
   - Update `sortByPinnedAt` and `sortByUpdatedAt` in `src/features/sidebar/store/useConversationsStore.ts` to perform in-place sorting (`conversations.sort(...)`) instead of cloning the array first (`[...conversations].sort(...)`), because all callers already pass freshly instantiated arrays.

4. **Verify frontend application**
   - Run `pnpm check` and `pnpm lint` to ensure typing and linting pass.

5. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

6. **Submit PR**
   - Create a PR with title "⚡ Bolt: [improvement]" outlining What, Why, Impact, and Measurement of the performance improvements.
