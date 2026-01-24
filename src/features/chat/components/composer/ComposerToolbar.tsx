"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Globe,
  Loader2,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { MODEL_CONFIGS } from "@/src/features/chat/lib/model-config";
import { SystemPromptPopover } from "./SystemPromptPopover";

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

  // Local state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedSearchEnabled = useRef(false);

  const currentModelLabel =
    MODEL_CONFIGS.find((m) => m.id === currentModel)?.label ?? "";

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
        <SystemPromptPopover />

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
            <div className="flex flex-col gap-1 px-1 py-1 max-h-[300px] overflow-y-auto">
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
