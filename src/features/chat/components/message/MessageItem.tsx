"use client";

import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/src/shared/components/Markdown";
import { ImagePreview } from "@/src/shared/components/ImagePreview";
import { Message } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/src/shared/utils/file";
import { ResearchBlock } from "./research/ResearchBlock";
import { Copy, Check, Paperclip, AlertCircle, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

type BranchButtonProps = {
  messageIndex: number;
};

const BranchButton = ({ messageIndex }: BranchButtonProps) => {
  const router = useRouter();
  const branchFromMessage = useChatStore((state) => state.branchFromMessage);
  const [open, setOpen] = useState(false);
  const [isBranching, setIsBranching] = useState(false);

  const handleConfirm = async () => {
    if (isBranching) return;
    setIsBranching(true);
    try {
      await branchFromMessage(messageIndex, (path) => router.push(path));
      setOpen(false);
    } finally {
      setIsBranching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-xs"
          title="从此消息分支"
        >
          <GitBranch className="h-3.5 w-3.5" />
          分支
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建分支对话</DialogTitle>
          <DialogDescription>
            将从此消息创建一个新的对话分支，包含该消息及之前的所有历史消息。
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

type MessageItemProps = {
  message: Message;
  index: number;
  isStreaming: boolean;
};

export const MessageItem = memo(function MessageItem({
  message,
  index,
  isStreaming,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const attachmentBlocks = message.blocks.filter(
    (
      block
    ): block is Extract<Message["blocks"][number], { type: "attachments" }> =>
      block.type === "attachments"
  );
  const contentBlocks = message.blocks.filter(
    (block) => block.type !== "attachments"
  );

  return (
    <div
      key={`${message.role}-${index}`}
      className={cn(
        "group/message flex flex-col space-y-2",
        isUser ? "ml-auto max-w-[90%] sm:max-w-[85%]" : "mr-auto w-full"
      )}
    >
      {isUser && attachmentBlocks.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {attachmentBlocks.flatMap((block) =>
            block.attachments.map((attachment) =>
              attachment.kind === "image" ? (
                <ImagePreview
                  key={attachment.id}
                  url={attachment.displayUrl}
                  name={attachment.name}
                  size={attachment.size}
                  className="shrink-0"
                />
              ) : (
                <div
                  key={attachment.id}
                  className="flex w-[220px] shrink-0 items-center gap-3 rounded-xl border bg-card px-3 py-2"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-background text-muted-foreground">
                    <Paperclip className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}

      {(isUser ? contentBlocks.length > 0 : true) && (
        <div
          className={cn(
            "rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 transition-all",
            isUser ? "bg-muted text-foreground" : "bg-transparent"
          )}
        >
          {isUser ? (
            <div className="flex flex-col space-y-4">
              {contentBlocks.map((block, blockIndex) => {
                const blockKey = `${index}-${blockIndex}`;

                if (block.type === "content") {
                  return (
                    <div
                      key={blockKey}
                      className="text-base leading-relaxed text-foreground"
                    >
                      <Markdown content={block.content} />
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {contentBlocks.map((block, blockIndex) => {
                const blockKey = `${index}-${blockIndex}`;
                if (block.type === "research") {
                  return (
                    <ResearchBlock
                      key={blockKey}
                      items={block.items}
                      blockIndex={blockIndex}
                      messageIndex={index}
                      isActive={
                        isStreaming && blockIndex === contentBlocks.length - 1
                      }
                    />
                  );
                }

                if (block.type === "error") {
                  return (
                    <div
                      key={blockKey}
                      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 whitespace-pre-wrap">
                        {block.message}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={blockKey}
                    className="text-base leading-relaxed text-foreground"
                  >
                    <Markdown content={block.content} />
                    {isStreaming && blockIndex === contentBlocks.length - 1 && (
                      <span className="ml-1 inline-flex h-5 w-0.5 animate-pulse bg-accent align-middle" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Only show copy button for user messages OR for assistant messages when not streaming */}
      {(isUser || !isStreaming) && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover/message:opacity-100 group-hover/message:pointer-events-auto group-focus-within/message:opacity-100 group-focus-within/message:pointer-events-auto",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <CopyButton blocks={message.blocks} />
          {!isUser && !isStreaming && <BranchButton messageIndex={index} />}
        </div>
      )}
    </div>
  );
});
