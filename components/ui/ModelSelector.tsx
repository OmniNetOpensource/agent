"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { chatModels, ChatModelId } from "@/lib/models";

interface ModelSelectorProps {
  currentModel: ChatModelId;
  onModelChange: (modelId: ChatModelId) => void;
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModelLabel = chatModels.find((m) => m.id === currentModel)?.label || currentModel;

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
        <span className="truncate">{currentModelLabel}</span>
        <ChevronDown className={`w-4 h-4 text-(--text-tertiary) transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 w-full z-50 min-w-[200px] overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-card) shadow-lg origin-top-left">
          <div className="p-1">
            {chatModels.map((model) => (
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
