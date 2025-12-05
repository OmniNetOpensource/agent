"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { ChatModelId } from "@/src/features/model/lib/openrouter";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ModelOption = {
  id: ChatModelId;
  label: string;
};

const MODELS: ModelOption[] = [
  { id: "x-ai/grok-4.1-fast", label: "轻舟" },
  { id: "google/gemini-3-pro-preview", label: "博学" },
  { id: "deepseek/deepseek-v3.2", label: "中国做题家" },
  { id: "anthropic/claude-opus-4.5", label: "娴雅" },
];

export function ModelSelector() {
  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);
  const [isOpen, setIsOpen] = useState(false);

  const currentModelLabel =
    MODELS.find((m) => m.id === currentModel)?.label ?? "";

  useEffect(() => {
    if (!currentModel && MODELS.length > 0) {
      setCurrentModel(MODELS[0].id);
    }
  }, [currentModel, setCurrentModel]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "min-w-[60px] sm:min-w-[93px] justify-between px-3 py-2 text-xs sm:text-sm font-medium",
            isOpen && "bg-accent"
          )}
        >
          <span className="max-w-[60px] sm:max-w-[80px] truncate">
            {currentModelLabel || "未选择模型"}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-300",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-48 max-w-[calc(100vw-2rem)] p-1.5"
      >
        <div className="flex flex-col gap-1 px-1 py-1">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setCurrentModel(model.id);
                setIsOpen(false);
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
  );
}
