import { create } from "zustand";
import type { Conversation } from "@/types/conversation";

type ConversationsState = {
  conversations: Conversation[];
  conversationsLoading: boolean;
  hasFetched: boolean;
};

type ConversationsActions = {
  addConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  fetchConversations: () => Promise<void>;
};

export const useConversationsStore = create<
  ConversationsState & ConversationsActions
>((set) => ({
  conversations: [],
  conversationsLoading: false,
  hasFetched: false,
  addConversation: (conversation) =>
    set((state) => {
      const filtered = state.conversations.filter(
        (item) => item.id !== conversation.id
      );
      return { conversations: [conversation, ...filtered] };
    }),
  setConversations: (conversations) => set({ conversations }),
  fetchConversations: async () => {
    let skip = false;
    set((state) => {
      if (state.hasFetched || state.conversationsLoading) {
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

      if (data?.conversations) {
        fetched = true;
        set({ conversations: data.conversations, hasFetched: true });
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      set((state) => ({
        ...state,
        conversationsLoading: false,
        hasFetched: state.hasFetched || fetched,
      }));
    }
  },
}));
