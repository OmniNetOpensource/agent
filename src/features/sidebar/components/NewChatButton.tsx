"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewChatButton as NewChatLogic } from "@/src/shared/components/NewChatButton";

interface NewChatButtonProps {
  isCollapsed?: boolean;
}

export function NewChatButton({ isCollapsed = false }: NewChatButtonProps) {
  return (
    <Button
      asChild
      variant="ghost"
      className="group relative h-10 justify-start px-0 overflow-hidden transition-all duration-500"
      style={{ width: isCollapsed ? 40 : "100%" }}
      aria-label="新对话"
    >
      <NewChatLogic href="/app">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
        </span>
        <span
          className="overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-500"
          style={{
            width: isCollapsed ? 0 : "auto",
            opacity: isCollapsed ? 0 : 1,
          }}
        >
          新对话
        </span>
      </NewChatLogic>
    </Button>
  );
}
