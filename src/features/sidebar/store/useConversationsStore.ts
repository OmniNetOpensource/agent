import { create } from "zustand";
import type { Conversation } from "@/types/conversation";
import {
  localDB,
  type LocalConversation,
} from "@/src/shared/lib/indexed-db";

type ConversationsState = {
  conversations: Conversation[];
  conversationsLoading: boolean;
  hasLoadedLocal: boolean;
};

type ConversationsActions = {
  addConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  loadLocalConversations: () => Promise<void>;
  clearLocal: () => Promise<void>;
  pinConversation: (id: string) => Promise<void>;
  unpinConversation: (id: string) => Promise<void>;
};

const mergeAndSortConversations = (
  existing: Conversation[],
  incoming: Conversation[]
): Conversation[] => {
  const map = new Map<string, Conversation>();

  for (const conv of existing) {
    map.set(conv.id, conv);
  }

  for (const conv of incoming) {
    map.set(conv.id, conv);
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => {
    const aPinned = Boolean(a.pinned);
    const bPinned = Boolean(b.pinned);

    if (aPinned !== bPinned) {
      return aPinned ? -1 : 1;
    }

    if (aPinned && bPinned) {
      const aPinnedAt = a.pinned_at ?? a.updated_at ?? "";
      const bPinnedAt = b.pinned_at ?? b.updated_at ?? "";
      if (!aPinnedAt && !bPinnedAt) return 0;
      if (!aPinnedAt) return 1;
      if (!bPinnedAt) return -1;
      return bPinnedAt.localeCompare(aPinnedAt);
    }

    if (!a.updated_at && !b.updated_at) return 0;
    if (!a.updated_at) return 1;
    if (!b.updated_at) return -1;
    return b.updated_at.localeCompare(a.updated_at);
  });

  return merged;
};

const mapLocalToConversation = (
  local: LocalConversation
): Conversation => ({
  id: local.id,
  title: local.title,
  created_at: local.created_at,
  updated_at: local.updated_at,
  pinned: local.pinned,
  pinned_at: local.pinned_at,
  user_id: "",
});

export const useConversationsStore = create<
  ConversationsState & ConversationsActions
>((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  hasLoadedLocal: false,

  addConversation: (conversation) =>
    set((state) => {
      const next: Conversation = { ...conversation };
      const filtered = state.conversations.filter(
        (item) => item.id !== next.id
      );

      const merged = mergeAndSortConversations(filtered, [next]);
      return { conversations: merged };
    }),

  setConversations: (conversations) =>
    set((state) => ({
      conversations: mergeAndSortConversations(state.conversations, [
        ...conversations,
      ]),
    })),

  loadLocalConversations: async () => {
    const { hasLoadedLocal, conversationsLoading } = get();
    if (hasLoadedLocal || conversationsLoading) {
      return;
    }

    set((state) => ({ ...state, conversationsLoading: true }));

    try {
      const localConversations = await localDB.getAll();
      const mapped: Conversation[] = localConversations.map(
        mapLocalToConversation
      );

      set((state) => ({
        conversations: mergeAndSortConversations(state.conversations, mapped),
        hasLoadedLocal: true,
        conversationsLoading: false,
      }));
    } catch (error) {
      console.error("Failed to load local conversations:", error);
      set((state) => ({
        ...state,
        hasLoadedLocal: true,
        conversationsLoading: false,
      }));
    }
  },

  clearLocal: async () => {
    try {
      await localDB.clear();
    } catch (error) {
      console.error("Failed to clear local conversations:", error);
    }

    set((state) => ({
      ...state,
      conversations: [],
      hasLoadedLocal: true,
    }));
  },

  pinConversation: async (id) => {
    const { conversations } = get();
    const target = conversations.find((item) => item.id === id);
    if (!target) {
      return;
    }

    const pinned_at = new Date().toISOString();
    const updated: Conversation = {
      ...target,
      pinned: true,
      pinned_at,
    };

    set((state) => ({
      ...state,
      conversations: mergeAndSortConversations(
        state.conversations.filter((item) => item.id !== id),
        [updated]
      ),
    }));

    try {
      const existing = await localDB.get(id);
      if (existing) {
        await localDB.save({
          ...existing,
          pinned: true,
          pinned_at,
        });
      }
    } catch (error) {
      console.error("Failed to pin conversation:", error);
    }
  },

  unpinConversation: async (id) => {
    const { conversations } = get();
    const target = conversations.find((item) => item.id === id);
    if (!target) {
      return;
    }

    const updated: Conversation = {
      ...target,
      pinned: false,
      pinned_at: undefined,
    };

    set((state) => ({
      ...state,
      conversations: mergeAndSortConversations(
        state.conversations.filter((item) => item.id !== id),
        [updated]
      ),
    }));

    try {
      const existing = await localDB.get(id);
      if (existing) {
        await localDB.save({
          ...existing,
          pinned: false,
          pinned_at: undefined,
        });
      }
    } catch (error) {
      console.error("Failed to unpin conversation:", error);
    }
  },
}));
