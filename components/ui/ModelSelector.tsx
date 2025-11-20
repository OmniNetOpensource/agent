"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
      <span key={`highlight-${matchIndex}`} className="text-blue-500 font-medium">
        {label.slice(matchIndex, matchIndex + kwLength)}
      </span>,
    );

    searchIndex = matchIndex + kwLength;
    matchIndex = lowerLabel.indexOf(lowerKeyword, searchIndex);
  }

  if (searchIndex < label.length) {
    segments.push(label.slice(searchIndex));
  }

  return segments;
};

export function ModelSelector({
  currentModel,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const measurementRef = useRef<HTMLButtonElement | null>(null);
  const [itemHeight, setItemHeight] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [startIndex, setStartIndex] = useState<number>(0);
  const OVERSCAN = 3;

  const visibleModels = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return models;
    const lowerKeyword = trimmed.toLowerCase();
    return models.filter((model) =>
      model.label.toLowerCase().includes(lowerKeyword),
    );
  }, [models, search]);

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
    if (!isOpen || !scrollRef.current || !itemHeight || visibleModels.length === 0) return;
    const currentIndex = visibleModels.findIndex((m) => m.id === currentModel);
    if (currentIndex < 0) return;
    const container = scrollRef.current;
    const targetTop = currentIndex * itemHeight;
    container.scrollTop = targetTop;
    const rawIndex = Math.floor(targetTop / itemHeight) - OVERSCAN;
    const maxStart = Math.max(0, visibleModels.length - visibleCount);
    const nextStart = Math.min(Math.max(rawIndex, 0), maxStart);
    setStartIndex(nextStart);
  }, [isOpen, itemHeight, currentModel, visibleModels, OVERSCAN, visibleCount]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    setStartIndex(0);
  }, [search]);

  const handleScroll = () => {
    if (!scrollRef.current || !itemHeight) return;
    const container = scrollRef.current;
    const scrollTop = container.scrollTop;
    const rawIndex = Math.floor(scrollTop / itemHeight) - OVERSCAN;
    const maxStart = Math.max(0, visibleModels.length - visibleCount);
    const nextStart = Math.min(Math.max(rawIndex, 0), maxStart);
    setStartIndex(nextStart);
  };

  const safeVisibleCount = Math.min(visibleCount, visibleModels.length);
  const endIndex = Math.min(visibleModels.length, startIndex + safeVisibleCount);
  const totalHeight = itemHeight ? itemHeight * visibleModels.length : 0;

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
            {error ? (
              <div className="px-3 py-2 text-xs text-(--text-secondary)">
                模型加载失败，请重试
              </div>
            ) : (
              <>
                <div className="px-2 pb-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索模型..."
                    disabled={models.length === 0 || loading}
                    className="w-full rounded-lg border border-(--border-subtle) bg-(--surface-muted) px-3 py-2 text-sm text-foreground placeholder:text-(--text-tertiary) focus:outline-none focus:ring-2 focus:ring-(--border-strong) disabled:opacity-60"
                  />
                </div>

                {models.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-(--text-secondary)">
                    {loading ? "正在加载模型..." : "暂无可用模型"}
                  </div>
                ) : visibleModels.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-(--text-secondary)">
                    没有匹配的模型
                  </div>
                ) : (
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
                          const model = visibleModels[modelIndex];
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
                                <span className="truncate">{highlightLabel(model.label, search)}</span>
                                {currentModel === model.id && (
                                  <Check className="w-3.5 h-3.5 text-foreground" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      visibleModels.map((model) => (
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
                          <span className="truncate">{highlightLabel(model.label, search)}</span>
                          {currentModel === model.id && (
                            <Check className="w-3.5 h-3.5 text-foreground" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
