"use client";

import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { MessageItem } from "./MessageItem";
import {
  useChatRequestStore,
  useMessageTreeStore,
} from "@/src/features/chat/store";
import { getBranchInfo } from "@/src/features/chat/lib/tree";

type MessageItemContainerProps = {
  messageId: number;
  index: number;
  depth: number;
  isLast: boolean;
};

export const MessageItemContainer = memo(function MessageItemContainer({
  messageId,
  index,
  depth,
  isLast,
}: MessageItemContainerProps) {
  const message = useMessageTreeStore(
    useShallow((state) => state.messages[messageId - 1])
  );

  const pending = useChatRequestStore((state) => state.pending);
  const isStreaming = isLast && pending;

  // Compute a stable hash for branch info to prevent re-renders when topology is unchanged
  const branchInfoHash = useMessageTreeStore((state) => {
    const info = getBranchInfo(state.messages, messageId);
    if (!info) return null;
    return `${info.currentIndex}:${info.total}:${info.siblingIds.join(",")}`;
  });

  const branchInfo = useMemo(() => {
    if (!branchInfoHash) return null;
    const [currentIndex, total, siblingIdsStr] = branchInfoHash.split(":");
    return {
      currentIndex: Number(currentIndex),
      total: Number(total),
      siblingIds: siblingIdsStr.split(",").map(Number),
    };
  }, [branchInfoHash]);

  if (!message) {
    return null;
  }

  return (
    <MessageItem
      message={message}
      messageId={messageId}
      index={index}
      depth={depth}
      isStreaming={isStreaming}
      branchInfo={branchInfo}
    />
  );
});
