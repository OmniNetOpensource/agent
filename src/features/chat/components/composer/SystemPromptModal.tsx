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

type SystemPromptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  promptTitle: string;
  onPromptTitleChange: (value: string) => void;
  promptContent: string;
  onPromptContentChange: (value: string) => void;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
};

export function SystemPromptModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "确定",
  confirmDisabled,
  onConfirm,
  promptTitle,
  onPromptTitleChange,
  promptContent,
  onPromptContentChange,
  titlePlaceholder = "例如：代码讲解",
  contentPlaceholder = "例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。",
}: SystemPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">标题</div>
            <Input
              value={promptTitle}
              onChange={(event) => onPromptTitleChange(event.target.value)}
              placeholder={titlePlaceholder}
              className="h-8 flex-1 text-xs"
            />
          </div>
          <Textarea
            rows={6}
            value={promptContent}
            onChange={(event) => onPromptContentChange(event.target.value)}
            placeholder={contentPlaceholder}
            className="min-h-32 resize-none text-sm"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
