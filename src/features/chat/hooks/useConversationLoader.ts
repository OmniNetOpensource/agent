import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { localDB } from "@/src/shared/lib/indexed-db";

export function useConversationLoader(conversationId: string | undefined) {
  const router = useRouter();
  const currentConversationId = useChatStore((state) => state.conversationId);
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationId = useChatStore((state) => state.setConversationId);

  useEffect(() => {
    if (!conversationId || currentConversationId === conversationId) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;
    let canceled = false;

    const load = async () => {
      try {
        const conversation = await localDB.get(conversationId);
        if (canceled || signal.aborted) {
          return;
        }

        if (!conversation) {
          router.replace("/404");
          return;
        }

        const mapped = (conversation.messages ?? []).map((msg) => ({
          role: msg.role,
          blocks: Array.isArray(msg.blocks)
            ? msg.blocks.map((block) =>
                block.type === "research"
                  ? {
                      ...block,
                      items: block.items.map((item) => ({ ...item })),
                    }
                  : block.type === "attachments"
                  ? {
                      ...block,
                      attachments: block.attachments.map((att) => ({
                        ...att,
                      })),
                    }
                  : { ...block }
              )
            : [],
        }));

        if (canceled || signal.aborted) {
          return;
        }

        setConversationId(conversationId);
        setMessages(mapped);
      } catch (error) {
        if (canceled || signal.aborted) {
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load conversation:", error);
        router.replace("/404");
      }
    };

    void load();

    return () => {
      canceled = true;
      abortController.abort();
    };
  }, [
    conversationId,
    currentConversationId,
    router,
    setConversationId,
    setMessages,
  ]);

  return { isLoading: conversationId !== currentConversationId };
}
