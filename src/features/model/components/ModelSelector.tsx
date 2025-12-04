"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, Check } from "lucide-react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";
import { ChatModelId } from "@/src/features/model/lib/openrouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { id: "openai/gpt-5.1-codex-mini", label: "轻舟" },
];

const highlightLabel = (label: string, keyword: string): ReactNode => {
  const trimmed = keyword.trim();
  if (!trimmed) return label;

  const lowerLabel = label.toLowerCase();
  const lowerKeyword = trimmed.toLowerCase();
  const kwLength = lowerKeyword.length;
  const segments: ReactNode[] = [];

  let searchIndex = 0;
  let matchIndex = lowerLabel.indexOf(lowerKeyword, searchIndex);

  if (matchIndex === -1) return label;

  while (matchIndex !== -1) {
    if (matchIndex > searchIndex) {
      segments.push(label.slice(searchIndex, matchIndex));
    }

    segments.push(
      <span
        key={`highlight-${matchIndex}`}
        className="text-blue-500 font-medium"
      >
        {label.slice(matchIndex, matchIndex + kwLength)}
      </span>
    );

    searchIndex = matchIndex + kwLength;
    matchIndex = lowerLabel.indexOf(lowerKeyword, searchIndex);
  }

  if (searchIndex < label.length) {
    segments.push(label.slice(searchIndex));
  }

  return segments;
};

export function ModelSelector() {
  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const trimmedSearch = search.trim();
  const visibleModels =
    trimmedSearch === ""
      ? MODELS
      : MODELS.filter((model) =>
          model.label.toLowerCase().includes(trimmedSearch.toLowerCase())
        );

  const virtualizer = useVirtualizer({
    count: visibleModels.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 3,
  });

  const currentModelLabel =
    MODELS.find((m) => m.id === currentModel)?.label || currentModel;

  useEffect(() => {
    if (!currentModel && MODELS.length > 0) {
      setCurrentModel(MODELS[0].id);
    }
  }, [currentModel, setCurrentModel]);

  useEffect(() => {
    if (trimmedSearch !== "" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [search, trimmedSearch]);

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        virtualizer.measure();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, virtualizer]);

  useEffect(() => {
    if (isOpen && trimmedSearch === "" && currentModel && MODELS.length > 0) {
      const currentIndex = MODELS.findIndex((m) => m.id === currentModel);
      if (currentIndex !== -1) {
        // 确保测量完成后再滚动
        const timer = setTimeout(() => {
          virtualizer.measure();
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(currentIndex, { align: "center" });
          });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, currentModel, trimmedSearch, virtualizer]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "min-w-[120px] sm:min-w-[180px] justify-between px-3 py-2 text-xs sm:text-sm font-medium",
            isOpen && "bg-accent"
          )}
        >
          <span className="max-w-[120px] sm:max-w-[160px] truncate">
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
        className="min-w-[240px] max-w-[calc(100vw-2rem)] p-1.5"
      >
        <>
          <div className="px-2 pb-2 pt-1">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索模型..."
              className="h-9 text-xs sm:text-sm"
            />
          </div>

          {visibleModels.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              没有匹配的模型
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="max-h-[250px] overflow-y-auto px-1"
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const model = visibleModels[virtualItem.index];
                  return (
                    <div
                      key={model.id}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <button
                        onClick={() => {
                          setCurrentModel(model.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-3.5 rounded-lg text-xs sm:text-sm text-left transition-all duration-200 cursor-pointer hover:bg-accent",
                          currentModel === model.id && "font-semibold"
                        )}
                      >
                        <span>{highlightLabel(model.label, search)}</span>
                        {currentModel === model.id && (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      </PopoverContent>
    </Popover>
  );
}
