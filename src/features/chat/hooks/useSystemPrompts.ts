"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const SYSTEM_PROMPTS_KEY = "system-prompts";
const SELECTED_PROMPT_KEY = "selected-prompt-id";

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `prompt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const normalizePrompts = (raw: string | null) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Partial<SystemPrompt>;
        if (typeof record.id !== "string") return null;
        if (typeof record.name !== "string") return null;
        const createdAt =
          typeof record.createdAt === "number" ? record.createdAt : Date.now();
        const updatedAt =
          typeof record.updatedAt === "number" ? record.updatedAt : createdAt;
        return {
          id: record.id,
          name: record.name,
          content: typeof record.content === "string" ? record.content : "",
          createdAt,
          updatedAt,
        } as SystemPrompt;
      })
      .filter((item): item is SystemPrompt => Boolean(item));
  } catch (error) {
    console.error("Failed to parse system prompts:", error);
    return [];
  }
};

const generateName = (prompts: SystemPrompt[]) => {
  const existing = prompts
    .map((prompt) => prompt.name.match(/^指令 (\d+)$/))
    .filter(Boolean)
    .map((match) => Number.parseInt(match![1] ?? "0", 10))
    .filter((value) => Number.isFinite(value));
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `指令 ${max + 1}`;
};

export function useSystemPrompts() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPrompts = normalizePrompts(
      window.localStorage.getItem(SYSTEM_PROMPTS_KEY)
    );
    setPrompts(storedPrompts);

    const storedSelectedId =
      window.localStorage.getItem(SELECTED_PROMPT_KEY);
    const isValidSelection =
      storedSelectedId &&
      storedPrompts.some((prompt) => prompt.id === storedSelectedId);
    const nextSelectedId = isValidSelection ? storedSelectedId : null;
    setSelectedPromptId(nextSelectedId);

    if (!nextSelectedId) {
      window.localStorage.removeItem(SELECTED_PROMPT_KEY);
    }
  }, []);

  const persistPrompts = useCallback((nextPrompts: SystemPrompt[]) => {
    setPrompts(nextPrompts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SYSTEM_PROMPTS_KEY,
        JSON.stringify(nextPrompts)
      );
    }
  }, []);

  const persistSelected = useCallback((id: string | null) => {
    setSelectedPromptId(id);
    if (typeof window === "undefined") return;
    if (id) {
      window.localStorage.setItem(SELECTED_PROMPT_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_PROMPT_KEY);
    }
  }, []);

  const createPrompt = useCallback(() => {
    const now = Date.now();
    const prompt: SystemPrompt = {
      id: generateId(),
      name: generateName(prompts),
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    const nextPrompts = [...prompts, prompt];
    persistPrompts(nextPrompts);
    persistSelected(prompt.id);
    return prompt;
  }, [persistPrompts, persistSelected, prompts]);

  const updatePrompt = useCallback(
    (id: string, updates: Partial<Pick<SystemPrompt, "name" | "content">>) => {
      const now = Date.now();
      const nextPrompts = prompts.map((prompt) =>
        prompt.id === id
          ? {
              ...prompt,
              ...updates,
              updatedAt: now,
            }
          : prompt
      );
      persistPrompts(nextPrompts);
    },
    [persistPrompts, prompts]
  );

  const deletePrompt = useCallback(
    (id: string) => {
      const index = prompts.findIndex((prompt) => prompt.id === id);
      if (index === -1) return;

      const nextPrompts = prompts.filter((prompt) => prompt.id !== id);
      persistPrompts(nextPrompts);

      if (selectedPromptId !== id) {
        return;
      }

      const fallbackPrompt =
        prompts[index - 1] ?? prompts[index + 1] ?? null;
      persistSelected(fallbackPrompt?.id ?? null);
    },
    [persistPrompts, persistSelected, prompts, selectedPromptId]
  );

  const selectPrompt = useCallback(
    (id: string | null) => {
      if (!id) {
        persistSelected(null);
        return;
      }
      const exists = prompts.some((prompt) => prompt.id === id);
      persistSelected(exists ? id : null);
    },
    [persistSelected, prompts]
  );

  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? null,
    [prompts, selectedPromptId]
  );

  return {
    prompts,
    selectedPromptId,
    selectedPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    selectPrompt,
  } as const;
}
