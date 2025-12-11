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
  const authLoading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!conversationId || currentConversationId === conversationId) {
      return;
    }

    const load = async () => {
      try {
        // 未登录用户：只从本地读取
        if (!user) {
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
          return;
        }

        // 已登录用户：同时查询远端和本地，优先远端，有则用远端，否则退回本地
        const [remoteResult, localResult] = await Promise.allSettled([
          fetchConversationMessages(conversationId),
          localDB.getMessages(conversationId),
        ]);

        let messagesFromRemote = null as Awaited<
          ReturnType<typeof fetchConversationMessages>
        > | null;
        if (remoteResult.status === "fulfilled" && remoteResult.value.length) {
          messagesFromRemote = remoteResult.value;
        }

        let messagesFromLocal = null as Awaited<
          ReturnType<typeof localDB.getMessages>
        > | null;
        if (
          localResult.status === "fulfilled" &&
          localResult.value.length > 0
        ) {
          messagesFromLocal = localResult.value;
        }

        if (messagesFromRemote) {
          setConversationId(conversationId);
          setMessages(messagesFromRemote);
          return;
        }

        if (messagesFromLocal) {
          const mapped = messagesFromLocal.map((msg) => ({
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
          return;
        }

        router.replace("/404");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load conversation:", error);
        router.replace("/404");
      }
    };

    void load();
  }, [authLoading]);

  return { isLoading: conversationId !== currentConversationId };
}
