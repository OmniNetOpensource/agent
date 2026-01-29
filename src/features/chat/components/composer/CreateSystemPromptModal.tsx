import { useEffect, useState } from "react";
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

type CreateSystemPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { name: string; content: string }) => void;
};

export function CreateSystemPromptModal({
  open,
  onOpenChange,
  onConfirm,
}: CreateSystemPromptModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const canConfirm = content.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ name: title, content });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建指令</DialogTitle>
          <DialogDescription>填写系统指令内容，确定后保存。</DialogDescription>
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
        <DialogFooter>
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
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
