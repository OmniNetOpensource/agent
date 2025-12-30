"use client";

import { useCallback, useMemo, useState } from "react";

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

const getInitialPrompts = (): SystemPrompt[] => {
  if (typeof window === "undefined") return [];
  return normalizePrompts(window.localStorage.getItem(SYSTEM_PROMPTS_KEY));
};

const getInitialSelectedId = (prompts: SystemPrompt[]): string | null => {
  if (typeof window === "undefined") return null;
  const storedSelectedId = window.localStorage.getItem(SELECTED_PROMPT_KEY);
  const isValidSelection =
    storedSelectedId && prompts.some((prompt) => prompt.id === storedSelectedId);
  if (!isValidSelection && storedSelectedId) {
    window.localStorage.removeItem(SELECTED_PROMPT_KEY);
  }
  return isValidSelection ? storedSelectedId : null;
};

export function useSystemPrompts() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>(getInitialPrompts);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(() =>
    getInitialSelectedId(prompts)
  );

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

  const createPrompt = useCallback(
    (options?: Partial<Pick<SystemPrompt, "name" | "content">>) => {
      const now = Date.now();
      const nextName =
        typeof options?.name === "string" && options.name.trim().length > 0
          ? options.name.trim()
          : generateName(prompts);
      const prompt: SystemPrompt = {
        id: generateId(),
        name: nextName,
        content: typeof options?.content === "string" ? options.content : "",
        createdAt: now,
        updatedAt: now,
      };
      const nextPrompts = [...prompts, prompt];
      persistPrompts(nextPrompts);
      persistSelected(prompt.id);
      return prompt;
    },
    [persistPrompts, persistSelected, prompts]
  );

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

      const fallbackPrompt = prompts[index - 1] ?? prompts[index + 1] ?? null;
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
    selectedPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
    selectPrompt,
  } as const;
}
