"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Composer } from "@/src/features/chat/components/Composer";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const router = useRouter();

  const currentConversationId = useChatStore((state) => state.conversationId);
  const fetchLoading = useChatStore((state) => state.fetchLoading);
  const fetchConversation = useChatStore((state) => state.fetchConversation);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    // 当前会话已经是这个 ID 时，不再重复拉取
    if (currentConversationId === conversationId) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await fetchConversation(conversationId);
        if (cancelled) return;
      } catch (error) {
        if (cancelled) return;
        // 拉取失败，一律跳转到 404 页面
        console.error("Failed to load conversation:", error);
        router.replace("/404");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [conversationId, currentConversationId, fetchConversation, router]);

  if (fetchLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载对话中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <MessageList />
          <Composer />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
