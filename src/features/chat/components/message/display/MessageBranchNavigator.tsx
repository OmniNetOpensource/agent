"use client";

import { useChatRequestStore, useMessageTreeStore } from "@/src/features/chat/store";
import { BranchNavigator } from "../editing/BranchNavigator";
import type { BranchInfo } from "@/src/features/chat/types/chat";

type MessageBranchNavigatorProps = {
  branchInfo: BranchInfo;
  messageId: number;
  depth: number;
};

export function MessageBranchNavigator({
  branchInfo,
  messageId,
  depth,
}: MessageBranchNavigatorProps) {
  const pending = useChatRequestStore((state) => state.pending);
  const navigateBranch = useMessageTreeStore((state) => state.navigateBranch);

  return (
    <BranchNavigator
      branchInfo={branchInfo}
      onNavigate={(direction) => navigateBranch(messageId, depth, direction)}
      disabled={pending}
    />
  );
}
