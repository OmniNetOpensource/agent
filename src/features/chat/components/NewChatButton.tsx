"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNewChat } from "../hooks/useNewChat";

export function NewChatButton() {
  const { handleNewChat } = useNewChat();

  return (
    <Button
      asChild
      variant="ghost"
      className="group relative h-10 w-10 overflow-hidden rounded-xl px-0 md:w-auto md:pr-3"
      aria-label="新对话"
    >
      <Link href="/app" onClick={handleNewChat}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
        </span>
        <span className="hidden overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 md:block">
          新对话
        </span>
      </Link>
    </Button>
  );
}
