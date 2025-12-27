"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  ChevronDown,
  PencilLine,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSystemPrompts } from "@/src/features/chat/hooks/useSystemPrompts";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { SystemPromptModal } from "./SystemPromptModal";

export function SystemPromptPopover() {
  const systemInstruction = useChatStore((state) => state.systemInstruction);
  const setSystemInstruction = useChatStore(
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createPromptTitle, setCreatePromptTitle] = useState("");
  const [createPromptValue, setCreatePromptValue] = useState("");
  const [editPromptTitle, setEditPromptTitle] = useState("");
  const [editPromptValue, setEditPromptValue] = useState("");

  const hasInstruction = systemInstruction.trim().length > 0;
  const instructionValue = selectedPrompt?.content ?? "";
  const canCreatePrompt = createPromptValue.trim().length > 0;
  const canEditPrompt = Boolean(
    selectedPrompt &&
      editPromptTitle.trim().length > 0 &&
      (editPromptTitle.trim() !== selectedPrompt.name ||
        editPromptValue !== selectedPrompt.content)
  );

  useEffect(() => {
    const nextContent = selectedPrompt?.content ?? "";
    setSystemInstruction(nextContent.trim());
  }, [selectedPrompt, setSystemInstruction]);

  const handlePromptSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    selectPrompt(value ? value : null);
  };

  const handleCreatePrompt = () => {
    setInstructionOpen(false);
    setCreatePromptTitle("");
    setCreatePromptValue("");
    setCreateDialogOpen(true);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setCreatePromptTitle("");
      setCreatePromptValue("");
    }
  };

  const handleConfirmCreate = () => {
    if (!canCreatePrompt) return;
    const created = createPrompt({
      name: createPromptTitle,
      content: createPromptValue,
    });
    handleCreateDialogOpenChange(false);
    if (created) {
      setSystemInstruction(created.content.trim());
    }
  };

  const handleEditPrompt = () => {
    if (!selectedPrompt) return;
    setInstructionOpen(false);
    setEditPromptTitle(selectedPrompt.name ?? "");
    setEditPromptValue(selectedPrompt.content ?? "");
    setEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditPromptTitle("");
      setEditPromptValue("");
    }
  };

  const handleConfirmEdit = () => {
    if (!selectedPrompt) return;
    const nextTitle = editPromptTitle.trim();
    if (!nextTitle) return;
    updatePrompt(selectedPrompt.id, {
      name: nextTitle,
      content: editPromptValue,
    });
    handleEditDialogOpenChange(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedPrompt) return;
    deletePrompt(selectedPrompt.id);
    setDeleteDialogOpen(false);
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
                  value={selectedPrompt?.id ?? ""}
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
                onClick={handleEditPrompt}
                className="h-8 gap-1.5 px-2 text-xs"
              >
                <PencilLine className="h-3.5 w-3.5" />
                编辑
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
            <Textarea
              rows={4}
              value={instructionValue}
              placeholder="例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。"
              readOnly
              className="h-32 resize-none overflow-y-auto text-sm"
            />
          </div>
        </PopoverContent>
      </Popover>

      <SystemPromptModal
        open={createDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
        title="新建指令"
        description="填写系统指令内容，确定后保存。"
        confirmLabel="确定"
        confirmDisabled={!canCreatePrompt}
        onConfirm={handleConfirmCreate}
        promptTitle={createPromptTitle}
        onPromptTitleChange={setCreatePromptTitle}
        promptContent={createPromptValue}
        onPromptContentChange={setCreatePromptValue}
      />

      <SystemPromptModal
        open={editDialogOpen}
        onOpenChange={handleEditDialogOpenChange}
        title="编辑指令"
        description="修改标题或内容后保存。"
        confirmLabel="保存"
        confirmDisabled={!canEditPrompt}
        onConfirm={handleConfirmEdit}
        promptTitle={editPromptTitle}
        onPromptTitleChange={setEditPromptTitle}
        promptContent={editPromptValue}
        onPromptContentChange={setEditPromptValue}
      />

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
