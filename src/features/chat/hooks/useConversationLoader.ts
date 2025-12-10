import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { fetchConversationMessages } from "@/src/features/chat/lib/api";
import { useAuthStore } from "@/src/features/auth/store/useAuthStore";
import { localDB } from "@/src/shared/lib/indexed-db";

export function useConversationLoader(conversationId: string | undefined) {
  const router = useRouter();
  const currentConversationId = useChatStore((state) => state.conversationId);
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!conversationId || currentConversationId === conversationId) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        if (user) {
          const messages = await fetchConversationMessages(
            conversationId,
            controller.signal
          );
          setConversationId(conversationId);
          setMessages(messages);
          return;
        }

        const localMessages = await localDB.getMessages(conversationId);
        if (!localMessages.length) {
          router.replace("/404");
          return;
        }

        const mapped = localMessages.map((msg) => ({
          role: msg.role,
          blocks: Array.isArray(msg.blocks)
            ? msg.blocks.map((block) =>
                block.type === "research"
                  ? {
                      ...block,
                      items: block.items.map((item) => ({ ...item })),
                    }
                  : { ...block }
              )
            : [],
        }));

        setConversationId(conversationId);
        setMessages(mapped);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load conversation:", error);
        router.replace("/404");
      }
    };

    void load();

    return () => {
      controller.abort();
    };
  }, [conversationId, currentConversationId, setConversationId, setMessages, router, user]);

  return { isLoading: conversationId !== currentConversationId };
}
