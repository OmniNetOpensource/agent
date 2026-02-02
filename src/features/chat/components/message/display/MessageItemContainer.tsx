"use client";

import { memo } from "react";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { MessageItem } from "./MessageItem";
import {
  useChatRequestStore,
  useMessageTreeStore,
} from "@/src/features/chat/store";
import { getBranchInfo } from "@/src/features/chat/lib/tree";
import type { BranchInfo } from "@/src/features/chat/types/chat";

type MessageItemContainerProps = {
  messageId: number;
  index: number;
  isLast: boolean;
};

const branchInfoEquality = (a: BranchInfo | null, b: BranchInfo | null) => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.currentIndex === b.currentIndex &&
    a.total === b.total &&
    a.siblingIds.length === b.siblingIds.length &&
    a.siblingIds.every((id, i) => id === b.siblingIds[i])
  );
};

export const MessageItemContainer = memo(function MessageItemContainer({
  messageId,
  index,
  isLast,
}: MessageItemContainerProps) {
  const message = useMessageTreeStore((state) => state.messages[messageId - 1]);

  const branchInfo = useStoreWithEqualityFn(
    useMessageTreeStore,
    (state) => getBranchInfo(state.messages, messageId),
    branchInfoEquality
  );

  const pending = useChatRequestStore((state) => state.pending);
  const isStreaming = isLast && pending;
  const depth = index + 1;

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
