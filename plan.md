1. **Optimize map values extraction in `src/features/sidebar/store/useConversationsStore.ts`**:
   - Change `splitAndSortConversations` to accept `Iterable<Conversation>` instead of `Conversation[]`.
   - Update `mergeConversations` to pass `map.values()` directly instead of creating an intermediate array with `Array.from(map.values())`.
2. **Optimize search operations in `src/features/sidebar/store/useConversationsStore.ts` (specifically `updateConversationTitle`)**:
   - Replace the array concatenation `const allConversations = [...pinnedConversations, ...normalConversations]; const target = allConversations.find(...)` with sequential find calls (`const target = pinnedConversations.find(...) ?? normalConversations.find(...)`) to avoid O(N) array allocation overhead.
3. **Optimize sorting in `src/features/sidebar/store/useConversationsStore.ts` (`sortByPinnedAt` and `sortByUpdatedAt`)**:
   - Remove the redundant shallow copy (`const sorted = [...conversations];`) and sort in-place using `conversations.sort(...)` since these functions are always called with fresh arrays (`pinned`, `normal` from `splitAndSortConversations` and inline array literals at lines 193 and 231).
4. **Verification Step**:
   - Run `pnpm check` and `pnpm lint` to ensure the codebase remains clean.
5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**:
   - Call the `pre_commit_instructions` tool.
6. **Submit PR**:
   - Create a PR with title "⚡ Bolt: [performance improvement]" and details including "What", "Why", "Impact", and "Measurement".
