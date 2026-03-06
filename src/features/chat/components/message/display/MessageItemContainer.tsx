"use client";

import { useMessageTreeStore } from "@/src/features/chat/store";
import { useShallow } from "zustand/react/shallow";
import { MessageItem } from "./MessageItem";

type MessageItemContainerProps = {
  messageId: number;
  index: number;
  depth: number;
  isStreaming: boolean;
};

export function MessageItemContainer({
  messageId,
  index,
  depth,
  isStreaming,
}: MessageItemContainerProps) {
  // Select only the specific message object. Since non-modified messages maintain
  // referential equality during appendToAssistant, this component will only re-render
  // when this specific message changes.
  const message = useMessageTreeStore((state) => state.messages[messageId - 1]);

  // Select primitive branch indicators with useShallow to prevent re-renders on every tree update
  // (like streaming chunks) while still updating when actual branching occurs.
  useMessageTreeStore(
    useShallow((state) => {
      const info = state.getBranchInfo(messageId);
      return info
        ? { currentIndex: info.currentIndex, total: info.total }
        : null;
    })
  );

  // Grab the stable getter to pass the full object to MessageItem.
  // We compute it during render. Since we only re-render when message or branch primitive state changes,
  // we avoid re-computing and re-rendering on every streaming chunk for non-active messages.
  const getBranchInfo = useMessageTreeStore((state) => state.getBranchInfo);

  if (!message) return null;

  return (
    <MessageItem
      message={message}
      messageId={messageId}
      index={index}
      depth={depth}
      isStreaming={isStreaming}
      branchInfo={getBranchInfo(messageId)}
    />
  );
}
