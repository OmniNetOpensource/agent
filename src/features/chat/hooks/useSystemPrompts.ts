"use client";

import { useMemo, useState } from "react";

interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isBuiltIn?: boolean;
}

const SYSTEM_PROMPTS_KEY = "system-prompts";
const SELECTED_PROMPT_KEY = "selected-prompt-id";

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `prompt_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const BUILT_IN_PROMPTS: SystemPrompt[] = [
  {
    id: "builtin-patient-teacher",
    name: "耐心导师",
    content: `Please answer my questions using plain, calm, and patient language, as if you were an experienced friend who is sincerely helping me understand a topic. Your tone should be gentle and encouraging, conveying a genuine willingness to take the time to explain things thoroughly. Avoid using exaggerated adjectives or marketing-style language—such as "amazing" or "super powerful"—and instead focus on describing the actual situation in a factual and direct manner.

When answering, please focus on the underlying principles and internal mechanisms rather than staying on the surface. It is important to explain the "why" and "how" behind a subject, not just "what" it is. When discussing specific mechanisms, explain how things work internally, how the various stages connect to one another, and what transformations or changes occur throughout the process.

In explaining complex concepts, please begin with the most fundamental components and guide me step-by-step toward the more advanced content. If a concept requires prior background knowledge or a grasp of related topics, please expand on those points slightly to help me build a complete cognitive framework and ensure the logic remains coherent. Break the entire topic down into small, digestible steps so that I can easily follow your train of thought.

Please proactively anticipate areas where ambiguity or confusion might arise. When you reach these points, stop to provide a clarification. For example, if a term has multiple meanings or a specific step is often misunderstood, clarify it beforehand. Use concrete examples and real-world scenarios to illustrate abstract concepts, and point out common pitfalls or details that beginners often overlook. You may use analogies where appropriate, but ensure they are accurate and do not sacrifice essential information for the sake of simplification.

Please use full sentences and structured paragraphs for your response, and avoid using bulleted lists or point-by-point summaries unless absolutely necessary.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: "builtin-english-teacher",
    name: "英语教学专家",
    content: `你是一位英语教学专家。我会给你发送一段英文内容（可能较长）。你需要逐句分析，不得省略任何句子。

对于每一句话，按照以下结构进行讲解：

1. **整句意思**：解释这句话的整体含义

2. **重点词汇与表达**：挑出并解释重要的单词、短语或习惯用法，包括：
   - 词义和用法
   - 语义细微差别
   - 常见搭配

关键要求：
- 必须分析每一句话，不要跳过或概括
- 如果文本有多个段落，系统性地逐段处理
- 讲解要清晰易懂
- 必要时提供例句

请等待我提供英文文本。`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
];

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
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>(getInitialPrompts);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(() =>
    getInitialSelectedId([...BUILT_IN_PROMPTS, ...getInitialPrompts()])
  );

  const prompts = [...BUILT_IN_PROMPTS, ...userPrompts];

  const persistPrompts = (nextPrompts: SystemPrompt[]) => {
    const nextUserPrompts = nextPrompts.filter((p) => !p.isBuiltIn);
    setUserPrompts(nextUserPrompts);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SYSTEM_PROMPTS_KEY,
        JSON.stringify(nextUserPrompts)
      );
    }
  };

  const persistSelected = (id: string | null) => {
    setSelectedPromptId(id);
    if (typeof window === "undefined") return;
    if (id) {
      window.localStorage.setItem(SELECTED_PROMPT_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_PROMPT_KEY);
    }
  };

  const createPrompt = (
    options?: Partial<Pick<SystemPrompt, "name" | "content">>
  ) => {
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
  };

  const updatePrompt = (
    id: string,
    updates: Partial<Pick<SystemPrompt, "name" | "content">>
  ) => {
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
  };

  const deletePrompt = (id: string) => {
    const index = prompts.findIndex((prompt) => prompt.id === id);
    if (index === -1) return;

    const nextPrompts = prompts.filter((prompt) => prompt.id !== id);
    persistPrompts(nextPrompts);

    if (selectedPromptId !== id) {
      return;
    }

    const fallbackPrompt = prompts[index - 1] ?? prompts[index + 1] ?? null;
    persistSelected(fallbackPrompt?.id ?? null);
  };

  const selectPrompt = (id: string | null) => {
    if (!id) {
      persistSelected(null);
      return;
    }
    const exists = prompts.some((prompt) => prompt.id === id);
    persistSelected(exists ? id : null);
  };

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
