1. **Optimize sorting performance in `useConversationsStore.ts`**
   - In `sortByPinnedAt` and `sortByUpdatedAt`, string lexical comparison (`<`, `>`) will be used instead of `String.prototype.localeCompare` for sorting `pinned_at` and `updated_at` dates. This is approximately 2.5x faster according to memory entries and benchmarks.
   - Using in-place sorting for `sortByPinnedAt` and `sortByUpdatedAt` since they only receive newly created arrays when called within `splitAndSortConversations`, removing the unnecessary `[...conversations]` shallow copy.

2. **Optimize collection mapping in `splitAndSortConversations` and `mergeConversations`**
   - Change `mergeConversations` to take `Array.from(map.values())` out, and pass `map.values()` to `splitAndSortConversations` instead.
   - Refactor `splitAndSortConversations` to iterate directly over the `Iterable` to filter pinned and normal conversations into two arrays instead of doing an `Array.from(map.values())` allocating an intermediate array first.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run `pnpm check`, `pnpm lint` and other standard pre-commit validation.

4. **Submit PR**
   - Create a PR with title "⚡ Bolt: [improvement]" and a description following the required format.
