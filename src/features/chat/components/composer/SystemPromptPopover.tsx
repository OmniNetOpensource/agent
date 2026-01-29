"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  CircleDot,
  PencilLine,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSystemPrompts } from "@/src/features/chat/hooks/useSystemPrompts";
import { useChatRequestStore } from "@/src/features/chat/store";
import { CreateSystemPromptModal } from "./CreateSystemPromptModal";
import { EditSystemPromptModal } from "./EditSystemPromptModal";

export function SystemPromptPopover() {
  const setSystemInstruction = useChatRequestStore(
    (state) => state.setSystemInstruction
  );

  const {
    prompts,
    selectedPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    selectPrompt,
  } = useSystemPrompts();

  const [instructionOpen, setInstructionOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const editingPrompt =
    prompts.find((prompt) => prompt.id === editingPromptId) ?? null;
  const settingsButtonClass =
    "text-[var(--interactive-secondary)] hover:!text-[var(--interactive-secondary-hover)]";

  useEffect(() => {
    const nextContent = selectedPrompt?.content ?? "";
    setSystemInstruction(nextContent.trim());
  }, [selectedPrompt, setSystemInstruction]);

  const handlePromptSelect = (value: string | null) => {
    selectPrompt(value);
  };

  const handleCreatePrompt = () => {
    setInstructionOpen(false);
    setCreateDialogOpen(true);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  const handleConfirmCreate = (data: { name: string; content: string }) => {
    const created = createPrompt(data);
    if (created) {
      setSystemInstruction(created.content.trim());
    }
  };

  const handleEditPrompt = (prompt: (typeof prompts)[number]) => {
    setInstructionOpen(false);
    setEditingPromptId(prompt.id);
    selectPrompt(prompt.id);
    setEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingPromptId(null);
    }
  };

  const handleConfirmEdit = (data: { name: string; content: string }) => {
    if (!editingPromptId) return;
    updatePrompt(editingPromptId, data);
  };

  const handleConfirmDelete = () => {
    if (!editingPromptId) return;
    deletePrompt(editingPromptId);
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
              settingsButtonClass
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
            <div className="max-h-96 overflow-y-auto">
              <div className="flex flex-col gap-1 pr-1">
                <div
                  className={cn(
                    "group flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    selectedPrompt
                      ? "border-transparent hover:bg-[var(--surface-hover)]"
                      : "border-[var(--interactive-secondary)] bg-[var(--surface-hover)]"
                  )}
                  onClick={() => handlePromptSelect(null)}
                >
                  <div className="flex items-center gap-2">
                    {selectedPrompt ? (
                      <Circle className="h-4 w-4" />
                    ) : (
                      <CircleDot className="h-4 w-4" />
                    )}
                    <span>默认</span>
                  </div>
                </div>
                {prompts.map((prompt) => {
                  const isSelected = selectedPrompt?.id === prompt.id;
                  const isEditable = !prompt.isBuiltIn;
                  return (
                    <div
                      key={prompt.id}
                      className={cn(
                        "group flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "border-[var(--interactive-secondary)] bg-[var(--surface-hover)]"
                          : "border-transparent hover:bg-[var(--surface-hover)]"
                      )}
                      onClick={() => handlePromptSelect(prompt.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CircleDot className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        <span>{prompt.name}</span>
                      </div>
                      {isEditable ? (
                        <button
                          type="button"
                          aria-label="编辑系统指令"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditPrompt(prompt);
                          }}
                          className="rounded-sm p-1 opacity-0 transition-opacity hover:bg-[var(--surface-hover)] group-hover:opacity-100"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCreatePrompt}
              className={cn(
                "h-8 w-full justify-start gap-1.5 px-2 text-xs",
                settingsButtonClass
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              新建系统指令
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CreateSystemPromptModal
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        onConfirm={handleConfirmCreate}
      />

      <EditSystemPromptModal
        open={editDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        prompt={editingPrompt}
        onConfirm={handleConfirmEdit}
        onDelete={handleConfirmDelete}
      />
    </>
  );
}
