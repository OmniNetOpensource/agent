"use client";

import { useMessageTreeStore, useChatRequestStore } from "@/src/features/chat/store";
import { getBranchInfo } from "@/src/features/chat/lib/tree";
import { BranchNavigator } from "../editing/BranchNavigator";
import { cn } from "@/lib/utils";

type MessageBranchNavigationProps = {
  messageId: number;
  depth: number;
  isEditing: boolean;
  isUser: boolean;
};

export function MessageBranchNavigation({
  messageId,
  depth,
  isEditing,
  isUser,
}: MessageBranchNavigationProps) {
  const branchInfo = useMessageTreeStore((state) =>
    getBranchInfo(state.messages, messageId)
  );
  const pending = useChatRequestStore((state) => state.pending);
  const navigateBranch = useMessageTreeStore((state) => state.navigateBranch);

  if (!branchInfo || isEditing) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 transition-opacity duration-150 opacity-100 pointer-events-auto",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <BranchNavigator
        branchInfo={branchInfo}
        onNavigate={(direction) => navigateBranch(messageId, depth, direction)}
        disabled={pending}
      />
    </div>
  );
}
