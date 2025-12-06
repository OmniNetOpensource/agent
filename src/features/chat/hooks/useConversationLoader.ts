import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { fetchConversationMessages } from "@/src/features/chat/lib/api";

export function useConversationLoader(conversationId: string | undefined) {
  const router = useRouter();
  const currentConversationId = useChatStore((state) => state.conversationId);
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationId = useChatStore((state) => state.setConversationId);

  useEffect(() => {
    if (!conversationId || currentConversationId === conversationId) {
      return;
    }

    const controller = new AbortController();

    fetchConversationMessages(conversationId, controller.signal)
      .then((messages) => {
        setConversationId(conversationId);
        setMessages(messages);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load conversation:", error);
        router.replace("/404");
      });

    return () => {
      controller.abort();
    };
  }, [conversationId, currentConversationId, setConversationId, setMessages, router]);

  return { isLoading: conversationId !== currentConversationId };
}
