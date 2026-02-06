"use client";

import { memo } from "react";
import Markdown from "@/src/shared/components/Markdown";
import { ImagePreview } from "@/src/shared/components/ImagePreview";
import { BranchInfo, Message } from "@/src/features/chat/types/chat";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/src/shared/utils/file";
import { ResearchBlock } from "../research/ResearchBlock";
import { Paperclip, AlertCircle } from "lucide-react";
import { useEditingStore } from "@/src/features/chat/store";
import { MessageEditor } from "../editing/MessageEditor";
import { MessageActions, MessageBranchNavigation } from "./MessageActions";

type MessageItemProps = {
  message: Message;
  messageId: number;
  index: number;
  depth: number;
  isStreaming: boolean;
  branchInfo: BranchInfo | null;
};

export const MessageItem = memo(function MessageItem({
  message,
  messageId,
  index,
  depth,
  isStreaming,
  branchInfo,
}: MessageItemProps) {
  const isEditing = useEditingStore(
    (state) => state.editingState?.messageId === messageId,
  );

  const isUser = message.role === "user";
  const attachmentBlocks = message.blocks.filter(
    (
      block,
    ): block is Extract<Message["blocks"][number], { type: "attachments" }> =>
      block.type === "attachments",
  );
  const contentBlocks = message.blocks.filter(
    (block) => block.type !== "attachments",
  );

  return (
    <div
      key={`${message.role}-${index}`}
      className={cn(
        "w-full group/message flex flex-col space-y-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      {isUser && !isEditing && attachmentBlocks.length > 0 && (
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
                  className="flex w-[220px] shrink-0 items-center gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-(--surface-primary) text-muted-foreground">
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
              ),
            ),
          )}
        </div>
      )}

      {(isEditing || (isUser ? contentBlocks.length > 0 : true)) && (
        <>
          {isEditing ? (
            <MessageEditor messageId={messageId} depth={depth} />
          ) : isUser ? (
            <div
              className={cn(
                "rounded-xl sm:rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3",
                "bg-muted text-foreground max-w-[85%]",
              )}
            >
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
            <div className="flex flex-col space-y-3 min-w-0 w-full">
              {contentBlocks.map((block, blockIndex) => {
                const blockKey = `${index}-${blockIndex}`;
                if (block.type === "research") {
                  return (
                    <ResearchBlock
                      key={blockKey}
                      items={block.items}
                      blockIndex={blockIndex}
                      messageIndex={index}
                    />
                  );
                }

                if (block.type === "error") {
                  return (
                    <div
                      key={blockKey}
                      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
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
                      <span className="ml-1 inline-flex h-5 w-0.5 animate-pulse bg-(--feedback-cursor) align-middle" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <MessageActions
        message={message}
        messageId={messageId}
        depth={depth}
        isUser={isUser}
        isStreaming={isStreaming}
        isEditing={isEditing}
      />

      <MessageBranchNavigation
        messageId={messageId}
        depth={depth}
        branchInfo={branchInfo}
        isUser={isUser}
        isEditing={isEditing}
      />
    </div>
  );
});
