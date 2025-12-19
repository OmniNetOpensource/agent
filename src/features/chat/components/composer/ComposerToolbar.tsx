"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  Loader2,
  Paperclip,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import {
  MODEL_CONFIGS,
  getModelPermissions,
} from "@/src/features/chat/lib/model-config";

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

  // Model permissions
  const modelPermissions = currentModel
    ? getModelPermissions(currentModel)
    : undefined;
  const canUpload = modelPermissions?.canUpload ?? true;
  const canSearch = modelPermissions?.canSearch ?? true;

  // Local state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [instructionOpen, setInstructionOpen] = useState(false);
  const [instructionDraft, setInstructionDraft] = useState(systemInstruction);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedSearchEnabled = useRef(false);

  const currentModelLabel =
    MODEL_CONFIGS.find((m) => m.id === currentModel)?.label ?? "";
  const hasInstruction = systemInstruction.trim().length > 0;

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
    if (!canSearch) {
      setSearchEnabled(false);
      return;
    }

    if (!hasInitializedSearchEnabled.current) {
      hasInitializedSearchEnabled.current = true;
      const stored = window.localStorage.getItem(SEARCH_ENABLED_STORAGE_KEY);
      if (stored !== null) {
        setSearchEnabled(stored === "true");
      }
    }
    // 把 setCurrentModel、canSearch、setSearchEnabled 作为依赖
  }, [setCurrentModel, canSearch, setSearchEnabled]);

  // Handlers
  const handleSearchToggle = () => {
    const newValue = !searchEnabled;
    setSearchEnabled(newValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEARCH_ENABLED_STORAGE_KEY, String(newValue));
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (uploading || !canUpload) return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    await addAttachments(Array.from(files));
    event.target.value = "";
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleInstructionOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setInstructionDraft(systemInstruction);
    }
    setInstructionOpen(nextOpen);
  };

  const handleInstructionConfirm = () => {
    setSystemInstruction(instructionDraft.trim());
    setInstructionOpen(false);
  };

  const handleInstructionCancel = () => {
    setInstructionDraft(systemInstruction);
    setInstructionOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-1">
      {/* Left group: Search & Attachments */}
      <div className="flex items-center gap-1">
        {/* Search toggle */}
        <span
          title={
            canSearch
              ? "开启后，模型会自主决定是否搜索"
              : "当前模型不支持搜索功能"
          }
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchToggle}
            disabled={!canSearch}
            className={cn(
              "group h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium",
              !canSearch &&
                "cursor-not-allowed opacity-50 hover:text-muted-foreground",
              canSearch &&
                (searchEnabled
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground")
            )}
          >
            <Globe
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                canSearch &&
                  (searchEnabled ? "scale-110" : "group-hover:scale-110")
              )}
            />
            <span>联网</span>
          </Button>
        </span>

        {/* File picker */}
        <span
          title={
            uploading
              ? "正在上传附件..."
              : !canUpload
              ? "当前模型不支持上传附件"
              : "添加附件"
          }
        >
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
            disabled={uploading || !canUpload}
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
          onOpenChange={handleInstructionOpenChange}
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
              <Textarea
                rows={4}
                value={instructionDraft}
                onChange={(event) => setInstructionDraft(event.target.value)}
                placeholder="例如：你是一名擅长解释代码的前端导师，回答要简洁、分点。"
                className="h-32 resize-none overflow-y-auto text-sm"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleInstructionCancel}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={handleInstructionConfirm}
                >
                  确定
                </Button>
              </div>
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
    </div>
  );
}
