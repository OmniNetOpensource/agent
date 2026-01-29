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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useChatRequestStore, useComposerStore } from "@/src/features/chat/store";
import { MODEL_CONFIGS } from "@/src/features/chat/lib/config";
import { SystemPromptPopover } from "./SystemPromptPopover";
import type { SelectedSearchTool } from "@/src/features/chat/types/chat";

const MODEL_STORAGE_KEY = "selected-model";

const SEARCH_TOOL_LABELS: Record<SelectedSearchTool, string> = {
  none: "No search",
  brave_search: "Brave Search",
  serp_search: "SERP Search",
  tavily_search: "Tavily Search",
};

const SEARCH_TOOL_OPTIONS: Array<{
  value: SelectedSearchTool;
  label: string;
}> = [
  { value: "none", label: "No search" },
  { value: "brave_search", label: "Brave Search" },
  { value: "serp_search", label: "SERP Search" },
  { value: "tavily_search", label: "Tavily Search" },
];

export function ComposerToolbar() {
  // Store state
  const currentModel = useChatRequestStore((state) => state.currentModel);
  const setCurrentModel = useChatRequestStore((state) => state.setCurrentModel);
  const uploading = useComposerStore((state) => state.uploading);
  const addAttachments = useComposerStore((state) => state.addAttachments);
  const selectedSearchTool = useChatRequestStore(
    (state) => state.selectedSearchTool
  );
  const setSelectedSearchTool = useChatRequestStore(
    (state) => state.setSelectedSearchTool
  );

  // Local state
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentModelLabel =
    MODEL_CONFIGS.find((m) => m.id === currentModel)?.label ?? "";
  const selectedSearchLabel = SEARCH_TOOL_LABELS[selectedSearchTool];
  const isSearchActive = selectedSearchTool !== "none";
  const toolButtonBaseClass =
    "h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium text-[var(--interactive-secondary)] hover:!text-[var(--interactive-secondary-hover)]";

  // Initialize model from localStorage
  // 合并 model 初始化 effect
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

  }, [setCurrentModel]);

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
        {/* Search tool selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "group",
                toolButtonBaseClass,
                "data-[state=open]:bg-(--surface-hover) data-[state=open]:text-[var(--interactive-secondary-hover)]"
              )}
            >
              <Globe
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isSearchActive ? "scale-110" : "group-hover:scale-110"
                )}
              />
              <span className="max-w-[96px] truncate">{selectedSearchLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[11rem]">
            {SEARCH_TOOL_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => setSelectedSearchTool(option.value)}
                className={cn(
                  "flex items-center justify-between",
                  option.value === selectedSearchTool && "font-semibold"
                )}
              >
                <span>{option.label}</span>
                {option.value === selectedSearchTool ? (
                  <Check className="h-3.5 w-3.5 text-[var(--interactive-secondary)]" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
            className={cn(
              toolButtonBaseClass,
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:text-muted-foreground"
            )}
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
                toolButtonBaseClass,
                modelSelectorOpen &&
                  "bg-(--surface-hover) text-[var(--interactive-secondary-hover)]"
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
                    "flex w-full items-center justify-between gap-2 px-3 py-3.5 rounded-lg text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer hover:bg-(--surface-hover)",
                    currentModel === model.id && "font-semibold"
                  )}
                >
                  <span>{model.label}</span>
                  {currentModel === model.id && (
                    <Check className="w-3.5 h-3.5 text-[var(--interactive-secondary)]" />
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
