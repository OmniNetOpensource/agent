import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type EditSystemPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: {
    id: string;
    name: string;
    content: string;
    isBuiltIn: boolean;
  } | null;
  onConfirm: (data: { name: string; content: string }) => void;
  onDelete: () => void;
};

export function EditSystemPromptModal({
  open,
  onOpenChange,
  prompt,
  onConfirm,
  onDelete,
}: EditSystemPromptModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setDeleteDialogOpen(false);
      return;
    }

    if (prompt) {
      setTitle(prompt.name ?? "");
      setContent(prompt.content ?? "");
      setDeleteDialogOpen(false);
    } else {
      setTitle("");
      setContent("");
    }
  }, [open, prompt?.id]);

  const trimmedTitle = title.trim();
  const canConfirm = Boolean(
    prompt &&
      trimmedTitle.length > 0 &&
      (trimmedTitle !== prompt.name || content !== prompt.content)
  );
  const showDelete = Boolean(prompt && !prompt.isBuiltIn);
  const deleteTargetLabel =
    trimmedTitle || prompt?.name?.trim() || "这条指令";

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ name: trimmedTitle, content });
    onOpenChange(false);
  };

  const handleConfirmDelete = () => {
    if (!showDelete) return;
    onDelete();
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑指令</DialogTitle>
            <DialogDescription>修改标题或内容后保存。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">标题</div>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：代码讲解"
                className="h-8 flex-1 text-xs"
              />
            </div>
            <Textarea
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。"
              className="min-h-32 resize-none text-sm"
            />
          </div>
          <DialogFooter className={showDelete ? "sm:justify-between" : undefined}>
            {showDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-[var(--interactive-secondary)] hover:!text-[var(--interactive-secondary-hover)]"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="bg-[var(--interactive-secondary)] hover:bg-[var(--interactive-secondary-hover)]"
              >
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDelete ? (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除「{deleteTargetLabel}」吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                className="text-[var(--interactive-secondary)] hover:!text-[var(--interactive-secondary-hover)]"
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
      ) : null}
    </>
  );
}
