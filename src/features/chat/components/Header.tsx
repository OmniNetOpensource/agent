"use client";

import { NewChatButton } from "@/src/shared/components/NewChatButton";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex flex-col bg-transparent px-3 md:px-4 lg:px-6 py-0.5 md:py-1">
      <div className="flex items-center gap-3 px-1 md:px-3">
        <div className="ml-auto">
          <Button
            asChild
            variant="ghost"
            className="group relative h-10 w-10 overflow-hidden rounded-xl px-0 md:w-auto md:pr-3"
            aria-label="新对话"
          >
            <NewChatButton>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
              </span>
              <span className="hidden overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-300 md:block">
                新对话
              </span>
            </NewChatButton>
          </Button>
        </div>
      </div>
    </header>
  );
}
