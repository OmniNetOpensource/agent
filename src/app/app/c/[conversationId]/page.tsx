"use client";

import { use } from "react";
import { Composer } from "@/src/features/chat/components/composer/Composer";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useConversationLoader } from "@/src/features/chat/hooks/useConversationLoader";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);
  const { isLoading } = useConversationLoader(conversationId);

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <MessageList />
          <Composer />
        </div>
      </main>
    </div>
  );
}
