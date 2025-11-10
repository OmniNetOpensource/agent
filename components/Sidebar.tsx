"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type SidebarProps = {
  canClearConversation: boolean;
  onClear: () => void;
};

export default function Sidebar({
  canClearConversation,
  onClear,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-16 flex-col items-center gap-3 border-r border-(--border-subtle) bg-(--surface-muted) py-4">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onClear}
        disabled={!canClearConversation}
        title="清空对话"
        aria-label="清空对话"
        className="h-10! w-10! rounded-xl! p-0!"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </aside>
  );
}
