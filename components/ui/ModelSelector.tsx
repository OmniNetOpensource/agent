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
            {models.map((model) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
