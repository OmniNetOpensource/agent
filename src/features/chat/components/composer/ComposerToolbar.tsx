"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  Loader2,
  Paperclip,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { MODEL_CONFIGS } from "@/src/features/chat/lib/model-config";
import { useSystemPrompts } from "@/src/features/chat/hooks/useSystemPrompts";

const MODEL_STORAGE_KEY = "selected-model";
const SEARCH_ENABLED_STORAGE_KEY = "search-enabled";

export function ComposerToolbar() {
  // Store state
  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);
  const uploading = useChatStore((state) => state.uploading);
  const addAttachments = useChatStore((state) => state.addAttachments);
  const searchEnabled = useChatStore((state) => state.searchEnabled);
  const setSearchEnabled = useChatStore((state) => state.setSearchEnabled);
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

  // Local state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedSearchEnabled = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [instructionValue, setInstructionValue] = useState(systemInstruction);
  const [promptNameValue, setPromptNameValue] = useState(
    selectedPrompt?.name ?? ""
  );

  const currentModelLabel =
    MODEL_CONFIGS.find((m) => m.id === currentModel)?.label ?? "";
  const hasInstruction = instructionValue.trim().length > 0;

  const clearInstructionDebounce = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  // Initialize model from localStorage
  // 合并 model/searchEnabled 初始化 effect
  useEffect(() => {
    if (typeof window === "undefined") return;

    // --- 模型初始化 ---
    const storedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);
    let effectiveModelId: string | undefined;

    if (storedModel) {
      const isValidModel = MODEL_CONFIGS.some((m) => m.id === storedModel);
      if (isValidModel) {
        effectiveModelId = storedModel;
        setCurrentModel(storedModel);
      }
    }

    if (!effectiveModelId && MODEL_CONFIGS.length > 0) {
      const defaultModel = MODEL_CONFIGS[0].id;
      effectiveModelId = defaultModel;
      setCurrentModel(defaultModel);
    }

    // --- 搜索功能初始化 ---
    if (!hasInitializedSearchEnabled.current) {
      hasInitializedSearchEnabled.current = true;
      const stored = window.localStorage.getItem(SEARCH_ENABLED_STORAGE_KEY);
      if (stored !== null) {
        setSearchEnabled(stored === "true");
      }
    }
  }, [setCurrentModel, setSearchEnabled]);

  useEffect(() => {
    if (selectedPrompt) {
      setInstructionValue(selectedPrompt.content ?? "");
      setSystemInstruction((selectedPrompt.content ?? "").trim());
      return;
    }
    setInstructionValue("");
    setSystemInstruction("");
  }, [selectedPromptId, selectedPrompt, setSystemInstruction]);

  useEffect(() => {
    setPromptNameValue(selectedPrompt?.name ?? "");
  }, [selectedPrompt]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handlers
  const handleSearchToggle = () => {
    const newValue = !searchEnabled;
    setSearchEnabled(newValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEARCH_ENABLED_STORAGE_KEY, String(newValue));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    await addAttachments(Array.from(files));
    event.target.value = "";
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleInstructionChange = (value: string) => {
    if (!selectedPrompt) return;
    setInstructionValue(value);

    clearInstructionDebounce();
    const activePromptId = selectedPrompt?.id ?? null;
    debounceTimerRef.current = setTimeout(() => {
      setSystemInstruction(value.trim());
      if (activePromptId) {
        updatePrompt(activePromptId, { content: value });
      }
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
    <div className="flex items-center justify-between px-1">
      {/* Left group: Search & Attachments */}
      <div className="flex items-center gap-1">
        {/* Search toggle */}
        <span title="开启后，模型会自主决定是否搜索">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchToggle}
            className={cn(
              "group h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium",
              searchEnabled
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                searchEnabled ? "scale-110" : "group-hover:scale-110"
              )}
            />
            <span>联网</span>
          </Button>
        </span>

        {/* File picker */}
        <span title={uploading ? "正在上传附件..." : "添加附件"}>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePickFiles}
            disabled={uploading}
            className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
          </Button>
        </span>
      </div>

      {/* Right group: Instructions & Model */}
      <div className="flex items-center gap-1">
        {/* Custom instruction */}
        <Popover
          open={instructionOpen}
          onOpenChange={setInstructionOpen}
        >
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

        {/* Model selector */}
        <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground",
                modelSelectorOpen && "bg-accent text-foreground"
              )}
            >
              <span className="max-w-[80px] truncate">{currentModelLabel}</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-300",
                  modelSelectorOpen && "rotate-180"
                )}
              />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-48 max-w-[calc(100vw-2rem)] p-1.5"
          >
            <div className="flex flex-col gap-1 px-1 py-1">
              {MODEL_CONFIGS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setCurrentModel(model.id);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(MODEL_STORAGE_KEY, model.id);
                    }
                    setModelSelectorOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-3.5 rounded-lg text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer hover:bg-accent",
                    currentModel === model.id && "font-semibold"
                  )}
                >
                  <span>{model.label}</span>
                  {currentModel === model.id && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

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
    </div>
  );
}
