import { create } from "zustand";
import type { Conversation } from "@/types/conversation";

type ConversationsState = {
  conversations: Conversation[];
  conversationsLoading: boolean;
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
  addConversation: (conversation) =>
    set((state) => {
      const filtered = state.conversations.filter(
        (item) => item.id !== conversation.id
      );
      return { conversations: [conversation, ...filtered] };
    }),
  setConversations: (conversations) => set({ conversations }),
  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await fetch("/api/conversations?limit=10");
      const data = await res.json();

      if (data?.conversations) {
        set({ conversations: data.conversations });
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      set({ conversationsLoading: false });
    }
  },
}));
