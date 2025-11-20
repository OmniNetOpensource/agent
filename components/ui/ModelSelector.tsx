"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ChatModelId } from "@/lib/models";

interface ModelSelectorProps {
  currentModel: ChatModelId;
  onModelChange: (modelId: ChatModelId) => void;
}

type ModelOption = {
  id: ChatModelId;
  label: string;
};

export function ModelSelector({
  currentModel,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const measurementRef = useRef<HTMLButtonElement | null>(null);
  const [itemHeight, setItemHeight] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [startIndex, setStartIndex] = useState<number>(0);
  const OVERSCAN = 3;

  const currentModelLabel =
    models.find((m) => m.id === currentModel)?.label || currentModel;

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/models", { cache: "no-store" });
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
          onModelChange(defaultModelId);
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
  }, [currentModel, onModelChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || models.length === 0 || itemHeight) return;
    if (!measurementRef.current) return;
    const rect = measurementRef.current.getBoundingClientRect();
    if (rect.height > 0) {
      setItemHeight(rect.height);
    }
  }, [isOpen, models.length, itemHeight]);

  useEffect(() => {
    if (!isOpen || !scrollRef.current || !itemHeight) return;
    const container = scrollRef.current;
    const height = container.clientHeight;
    if (height > 0 && itemHeight > 0) {
      const baseCount = Math.ceil(height / itemHeight);
      const totalCount = baseCount + OVERSCAN * 2;
      setVisibleCount(Math.max(totalCount, baseCount));
    }
  }, [isOpen, itemHeight, OVERSCAN]);

  useEffect(() => {
    if (!isOpen || !scrollRef.current || !itemHeight || models.length === 0) return;
    const currentIndex = models.findIndex((m) => m.id === currentModel);
    if (currentIndex < 0) return;
    const container = scrollRef.current;
    const targetTop = currentIndex * itemHeight;
    container.scrollTop = targetTop;
    const rawIndex = Math.floor(targetTop / itemHeight) - OVERSCAN;
    const maxStart = Math.max(0, models.length - visibleCount);
    const nextStart = Math.min(Math.max(rawIndex, 0), maxStart);
    setStartIndex(nextStart);
  }, [isOpen, itemHeight, currentModel, models, OVERSCAN, visibleCount]);

  const handleScroll = () => {
    if (!scrollRef.current || !itemHeight) return;
    const container = scrollRef.current;
    const scrollTop = container.scrollTop;
    const rawIndex = Math.floor(scrollTop / itemHeight) - OVERSCAN;
    const maxStart = Math.max(0, models.length - visibleCount);
    const nextStart = Math.min(Math.max(rawIndex, 0), maxStart);
    setStartIndex(nextStart);
  };

  const safeVisibleCount = Math.min(visibleCount, models.length);
  const endIndex = Math.min(models.length, startIndex + safeVisibleCount);
  const totalHeight = itemHeight ? itemHeight * models.length : 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200
          bg-(--surface-muted) hover:bg-(--surface-hover) border border-(--border-subtle)
          text-foreground min-w-[180px] justify-between
          ${isOpen ? "ring-2 ring-neutral-400/20 border-neutral-400/40" : ""}
        `}
      >
        <span className="truncate">
          {loading && models.length === 0
            ? "加载模型中..."
            : error
            ? "模型加载失败"
            : currentModelLabel || "未选择模型"}
        </span>
        <ChevronDown className={`w-4 h-4 text-(--text-tertiary) transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-full z-50 min-w-[200px] overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card) shadow-lg origin-top-left">
          <div className="p-1">
            {error && (
              <div className="px-3 py-2 text-xs text-(--text-secondary)">
                模型加载失败，请重试
              </div>
            )}
            {!error && models.length === 0 && (
              <div className="px-3 py-2 text-xs text-(--text-secondary)">
                {loading ? "正在加载模型..." : "暂无可用模型"}
              </div>
            )}
            {!error && models.length > 0 && (
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="max-h-64 overflow-y-auto"
              >
                <div className="relative">
                  <button
                    ref={measurementRef}
                    type="button"
                    className={`
                      flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                      text-(--text-secondary)
                    `}
                    style={{
                      position: "absolute",
                      visibility: "hidden",
                      pointerEvents: "none",
                    }}
                    aria-hidden
                    tabIndex={-1}
                  >
                    <span className="truncate">{models[0].label}</span>
                  </button>
                </div>

                {itemHeight ? (
                  <div style={{ position: "relative", height: totalHeight }}>
                    {Array.from({ length: endIndex - startIndex }).map((_, idx) => {
                      const modelIndex = startIndex + idx;
                      const model = models[modelIndex];
                      return (
                        <div
                          key={model.id}
                          style={{
                            position: "absolute",
                            top: modelIndex * itemHeight,
                            left: 0,
                            right: 0,
                          }}
                        >
                          <button
                            onClick={() => {
                              onModelChange(model.id);
                              setIsOpen(false);
                            }}
                            className={`
                              flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                              ${currentModel === model.id 
                                ? "bg-(--surface-muted) text-foreground font-medium" 
                                : "text-(--text-secondary) hover:bg-(--surface-hover) hover:text-foreground"
                              }
                            `}
                          >
                            <span className="truncate">{model.label}</span>
                            {currentModel === model.id && (
                              <Check className="w-3.5 h-3.5 text-foreground" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setIsOpen(false);
                      }}
                      className={`
                        flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
                        ${currentModel === model.id 
                          ? "bg-(--surface-muted) text-foreground font-medium" 
                          : "text-(--text-secondary) hover:bg-(--surface-hover) hover:text-foreground"
                        }
                      `}
                    >
                      <span className="truncate">{model.label}</span>
                      {currentModel === model.id && (
                        <Check className="w-3.5 h-3.5 text-foreground" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
