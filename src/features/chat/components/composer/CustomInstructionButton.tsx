"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function CustomInstructionButton() {
  const systemInstruction = useChatStore((state) => state.systemInstruction);
  const setSystemInstruction = useChatStore(
    (state) => state.setSystemInstruction
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(systemInstruction);

  useEffect(() => {
    if (open) {
      setDraft(systemInstruction);
    }
  }, [open, systemInstruction]);

  const hasInstruction = systemInstruction.trim().length > 0;

  const handleConfirm = () => {
    setSystemInstruction(draft.trim());
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(systemInstruction);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 rounded-full px-3 text-xs font-medium",
            hasInstruction
              ? "text-blue-600 dark:text-blue-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          自定义指令
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">
            自定义系统指令
          </div>
          <Textarea
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。"
            className="h-32 resize-none overflow-y-auto text-sm"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleConfirm}
            >
              确定
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
