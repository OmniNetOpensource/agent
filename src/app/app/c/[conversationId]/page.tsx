"use client";

import { use } from "react";
import { Composer } from "@/src/features/chat/components/composer/Composer";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { Spinner } from "@/components/ui/spinner";
import { useConversationLoader } from "@/src/features/chat/hooks/useConversationLoader";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const { isLoading } = useConversationLoader(conversationId);

  if (isLoading) {
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
