"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSystemPrompts } from "@/src/features/chat/hooks/useSystemPrompts";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function SystemPromptPopover() {
  const systemInstruction = useChatStore((state) => state.systemInstruction);
  const setSystemInstruction = useChatStore(
    (state) => state.setSystemInstruction
  );

  const {
    prompts,
    selectedPromptId,
    selectedPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    selectPrompt,
  } = useSystemPrompts();

  const [instructionOpen, setInstructionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptNameValue, setPromptNameValue] = useState("");
  const [instructionValue, setInstructionValue] = useState("");

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasInstruction = systemInstruction.trim().length > 0;

  const clearInstructionDebounce = () => {
    if (!debounceTimerRef.current) {
      return;
    }
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  };

  useEffect(() => {
    if (selectedPrompt) {
      const nextContent = selectedPrompt.content ?? "";
      setPromptNameValue(selectedPrompt.name ?? "");
      setInstructionValue(nextContent);
      setSystemInstruction(nextContent.trim());
      return;
    }

    setPromptNameValue("");
    setInstructionValue("");
    setSystemInstruction("");
  }, [selectedPromptId, selectedPrompt, setSystemInstruction]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInstructionChange = (value: string) => {
    if (!selectedPrompt) return;

    setInstructionValue(value);
    setSystemInstruction(value.trim());

    clearInstructionDebounce();
    const activePromptId = selectedPrompt.id;
    debounceTimerRef.current = setTimeout(() => {
      updatePrompt(activePromptId, { content: value });
    }, 400);
  };

  const handlePromptSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    clearInstructionDebounce();
    const value = event.target.value;
    selectPrompt(value ? value : null);
  };

  const handleCreatePrompt = () => {
    clearInstructionDebounce();
    const created = createPrompt();
    if (created) {
      setInstructionValue(created.content);
      setPromptNameValue(created.name);
      setSystemInstruction(created.content.trim());
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedPrompt) return;
    clearInstructionDebounce();
    deletePrompt(selectedPrompt.id);
    setDeleteDialogOpen(false);
  };

  const commitPromptName = (value: string) => {
    if (!selectedPrompt) return;
    const nextName = value.trim();
    if (!nextName) {
      setPromptNameValue(selectedPrompt.name);
      return;
    }
    if (nextName !== selectedPrompt.name) {
      updatePrompt(selectedPrompt.id, { name: nextName });
    }
    setPromptNameValue(nextName);
  };

  const handlePromptNameBlur = () => {
    commitPromptName(promptNameValue);
  };

  return (
    <>
      <Popover open={instructionOpen} onOpenChange={setInstructionOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium",
              hasInstruction
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>指令</span>
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedPromptId ?? ""}
                  onChange={handlePromptSelect}
                  className={cn(
                    "border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 w-full appearance-none rounded-md border px-2 pr-7 text-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <option value="">默认</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCreatePrompt}
                className="h-8 gap-1.5 px-2 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                新建
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!selectedPrompt}
                onClick={() => setDeleteDialogOpen(true)}
                className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">名称</div>
              <Input
                value={promptNameValue}
                onChange={(event) => setPromptNameValue(event.target.value)}
                onBlur={handlePromptNameBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handlePromptNameBlur();
                  }
                }}
                placeholder="指令名称"
                disabled={!selectedPrompt}
                className="h-8 flex-1 text-xs"
              />
            </div>
            <Textarea
              rows={4}
              value={instructionValue}
              onChange={(event) => handleInstructionChange(event.target.value)}
              placeholder="例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。"
              disabled={!selectedPrompt}
              className="h-32 resize-none overflow-y-auto text-sm"
            />
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除「{selectedPrompt?.name}」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
