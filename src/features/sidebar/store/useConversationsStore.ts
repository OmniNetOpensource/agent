import { create } from "zustand";
import type { Conversation } from "@/types/conversation";

type ConversationsState = {
  conversations: Conversation[];
  conversationsLoading: boolean;
};

type ConversationsActions = {
  addConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
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
}));

