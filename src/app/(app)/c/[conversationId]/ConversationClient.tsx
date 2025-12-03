"use client";

import { useEffect } from "react";
import { MessageList } from "@/src/features/chat/components/MessageList";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

type Props = {
  conversationId: string;
};

export default function ConversationClient({ conversationId }: Props) {
  const setConversation = useChatStore((state) => state.setConversation);
  const messages = useChatStore((state) => state.messages);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    setConversation(conversationId);
  }, [conversationId]);

  // 当 conversationId === "new" 且没有消息时，返回 null（保持初始空白/欢迎态界面）
  if (conversationId === "new" && !hasMessages) {
    return null;
  }

  // 当 conversationId === "new" 且有消息时，渲染 MessageList（让未登录用户在当前页看到自己的消息）
  // 当 conversationId !== "new" 时，一律渲染 MessageList（保持登录用户查看历史会话行为不变）
  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <MessageList />
        </div>
      </div>
    </>
  );
}
