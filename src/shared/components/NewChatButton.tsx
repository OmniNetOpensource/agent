"use client";

import Link, { LinkProps } from "next/link";
import React from "react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

interface NewChatButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>,
    Partial<LinkProps> {
  children?: React.ReactNode;
  href?: LinkProps["href"];
}

export function NewChatButton({
  children,
  onClick,
  href = "/app",
  ...props
}: NewChatButtonProps) {
  const pending = useChatStore((state) => state.pending);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

    if (isModifiedClick) {
      if (onClick) {
        onClick(e);
      }
      return;
    }

    if (pending) {
      const confirmed = window.confirm(
        "AI正在生成内容，离开当前对话可能会丢失正在生成的内容，确定要离开吗？"
      );
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
