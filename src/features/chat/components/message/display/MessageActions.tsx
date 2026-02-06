"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BranchInfo, Message } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Pencil,
  RotateCcw,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useChatRequestStore,
  useEditingStore,
  useMessageTreeStore,
} from "@/src/features/chat/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BranchNavigator } from "../editing/BranchNavigator";

type CopyButtonProps = {
  blocks: Message["blocks"];
};

const CopyButton = ({ blocks }: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const text = blocks
      .filter((b) => b.type === "content")
      .map((b) => b.content)
      .join("\n\n");

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-auto gap-1.5 px-2 py-1 text-xs"
      title="复制内容"
    >
      {isCopied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {isCopied ? "已复制" : "复制"}
    </Button>
  );
};

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  icon: ReactNode;
  label: string;
};

const ActionButton = ({
  onClick,
  disabled,
  title,
  icon,
  label,
}: ActionButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-auto gap-1.5 px-2 py-1 text-xs"
    title={title}
  >
    {icon}
    {label}
  </Button>
);

type BranchConversationButtonProps = {
  messageId: number;
  disabled?: boolean;
};

const BranchConversationButton = ({
  messageId,
  disabled,
}: BranchConversationButtonProps) => {
  const router = useRouter();
  const branchToNewConversation = useMessageTreeStore(
    (state) => state.branchToNewConversation,
  );
  const [open, setOpen] = useState(false);
  const [isBranching, setIsBranching] = useState(false);

  const handleConfirm = async () => {
    if (isBranching) return;
    setIsBranching(true);
    try {
      await branchToNewConversation(messageId, (path) => router.push(path));
      setOpen(false);
    } finally {
      setIsBranching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-xs"
          title="创建新对话分支"
          disabled={disabled}
        >
          <GitBranch className="h-3.5 w-3.5" />
          分支对话
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建分支对话</DialogTitle>
          <DialogDescription>
            将以此消息为止的内容创建一个新的对话，原对话保持不变。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isBranching}
          >
            取消
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isBranching}>
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type MessageActionsProps = {
  message: Message;
  messageId: number;
  depth: number;
  isUser: boolean;
  isStreaming: boolean;
  isEditing: boolean;
};

export const MessageActions = ({
  message,
  messageId,
  depth,
  isUser,
  isStreaming,
  isEditing,
}: MessageActionsProps) => {
  const router = useRouter();
  const pending = useChatRequestStore((state) => state.pending);
  const startEditing = useEditingStore((state) => state.startEditing);
  const retryFromMessage = useEditingStore((state) => state.retryFromMessage);

  const shouldShowToolbar = !isEditing && (isUser || !isStreaming);

  if (!shouldShowToolbar) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 transition-opacity duration-150 opacity-100 pointer-events-auto",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {isUser && (
        <>
          <ActionButton
            onClick={() => startEditing(messageId)}
            disabled={pending}
            title="编辑消息"
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="编辑"
          />
          <ActionButton
            onClick={() =>
              retryFromMessage(messageId, depth, (path: string) =>
                router.push(path)
              )
            }
            disabled={pending}
            title="重试生成"
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="重试"
          />
        </>
      )}
      <CopyButton blocks={message.blocks} />
      {!isUser && (
        <ActionButton
          onClick={() =>
            retryFromMessage(messageId, depth, (path: string) =>
              router.push(path)
            )
          }
          disabled={pending}
          title="重试生成"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label="重试"
        />
      )}
      {!isUser && !isStreaming && (
        <BranchConversationButton messageId={messageId} disabled={pending} />
      )}
    </div>
  );
};

type MessageBranchNavigationProps = {
  messageId: number;
  depth: number;
  branchInfo: BranchInfo | null;
  isUser: boolean;
  isEditing: boolean;
};

export const MessageBranchNavigation = ({
  messageId,
  depth,
  branchInfo,
  isUser,
  isEditing,
}: MessageBranchNavigationProps) => {
  const pending = useChatRequestStore((state) => state.pending);
  const navigateBranch = useMessageTreeStore((state) => state.navigateBranch);

  if (!branchInfo || isEditing || branchInfo.total <= 1) return null;

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
};
