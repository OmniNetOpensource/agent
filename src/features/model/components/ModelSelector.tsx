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
  const [models, setModels] = useState<ModelOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const trimmedSearch = search.trim();
  const visibleModels =
    trimmedSearch === ""
      ? models
      : models.filter((model) =>
          model.label.toLowerCase().includes(trimmedSearch.toLowerCase())
        );

  const virtualizer = useVirtualizer({
    count: visibleModels.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 3,
  });

  const currentModelLabel =
    models.find((m) => m.id === currentModel)?.label || currentModel;

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/models", { cache: "no-cache" });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to load models: ${text}`);
        }
        const data = (await response.json()) as {
          models?: ModelOption[];
          defaultModelId?: ChatModelId;
        };
        if (!active) return;
        const incoming = Array.isArray(data.models) ? data.models : [];
        setModels(incoming);

        const defaultModelId =
          data.defaultModelId || incoming[0]?.id || currentModel;
        const hasCurrent =
          !!currentModel && incoming.some((model) => model.id === currentModel);
        if (!hasCurrent && defaultModelId) {
          setCurrentModel(defaultModelId);
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      active = false;
    };
  }, []);

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
    if (isOpen && trimmedSearch === "" && currentModel && models.length > 0) {
      const currentIndex = models.findIndex((m) => m.id === currentModel);
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
  }, [isOpen, currentModel, models, trimmedSearch, virtualizer]);

  if (loading) {
    return null;
  }

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
            {error ? "模型加载失败" : currentModelLabel || "未选择模型"}
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
        {error ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            模型加载失败，请重试
          </div>
        ) : (
          <>
            <div className="px-2 pb-2 pt-1">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索模型..."
                disabled={models.length === 0 || loading}
                className="h-9 text-xs sm:text-sm"
              />
            </div>

            {models.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                {loading ? "正在加载模型..." : "暂无可用模型"}
              </div>
            ) : visibleModels.length === 0 ? (
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
        )}
      </PopoverContent>
    </Popover>
  );
}
