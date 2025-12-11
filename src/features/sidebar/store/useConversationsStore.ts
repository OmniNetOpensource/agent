import { create } from "zustand";
import type { Conversation } from "@/types/conversation";
import {
  localDB,
  type LocalConversation,
} from "@/src/shared/lib/indexed-db";

type ConversationsState = {
  conversations: Conversation[];
  conversationsLoading: boolean;
  hasFetchedRemote: boolean;
  hasLoadedLocal: boolean;
};

type ConversationsActions = {
  addConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  fetchConversations: () => Promise<void>;
  loadLocalConversations: () => Promise<void>;
  clearLocal: () => Promise<void>;
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
  user_id: "",
});

export const useConversationsStore = create<
  ConversationsState & ConversationsActions
>((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  hasFetchedRemote: false,
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

  fetchConversations: async () => {
    let skip = false;
    set((state) => {
      if (state.hasFetchedRemote || state.conversationsLoading) {
        skip = true;
        return state;
      }
      return { ...state, conversationsLoading: true };
    });

    if (skip) {
      return;
    }

    let fetched = false;
    try {
      const res = await fetch("/api/conversations?limit=10");
      const data = await res.json();

      if (Array.isArray(data?.conversations)) {
        fetched = true;
        const remoteConversations: Conversation[] = data.conversations.map(
          (conv: Conversation) => ({
            ...conv,
            source: "remote",
          })
        );
        set((state) => ({
          conversations: mergeAndSortConversations(
            state.conversations,
            remoteConversations
          ),
          hasFetchedRemote: true,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      set((state) => ({
        ...state,
        conversationsLoading: false,
        hasFetchedRemote: state.hasFetchedRemote || fetched,
      }));
    }
  },

  loadLocalConversations: async () => {
    const { hasLoadedLocal } = get();
    if (hasLoadedLocal) {
      return;
    }

    try {
      const localConversations = await localDB.getConversations();
      const mapped: Conversation[] = localConversations.map(
        mapLocalToConversation
      );

      set((state) => ({
        conversations: mergeAndSortConversations(state.conversations, mapped),
        hasLoadedLocal: true,
      }));
    } catch (error) {
      console.error("Failed to load local conversations:", error);
      set((state) => ({ ...state, hasLoadedLocal: true }));
    }
  },

  clearLocal: async () => {
    try {
      await localDB.clearAll();
    } catch (error) {
      console.error("Failed to clear local conversations:", error);
    }

    set((state) => ({
      ...state,
      conversations: state.conversations.filter(
        (conversation) => conversation.user_id
      ),
      hasLoadedLocal: true,
    }));
  },
}));
