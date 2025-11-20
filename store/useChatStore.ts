import {
  Attachment,
  ContentBlock,
  Message,
  ResearchItem,
} from "@/types/chat";
import { ChatModelId, DEFAULT_CHAT_MODEL_ID } from "@/lib/models";
import {
  MAX_ATTACHMENT_SIZE,
  detectAttachmentKind,
  readFileAsDataUrl,
} from "@/utils/file";
import { create } from "zustand";

export type ChatState = {
  messages: Message[];
  input: string;
  pending: boolean;
  abortController: AbortController | null;
  currentModel: ChatModelId;
  pendingAttachments: Attachment[];
};

export type ChatActions = {
  setInput: (value: string) => void;
  setMessages: (messages: Message[]) => void;
  resetConversation: () => void;
  clearConversation: () => void;
  addAttachments: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => void;
  appendToAssistant: (addition: ContentBlock | ResearchItem) => void;
  toggleResearchBlock: (messageIndex: number, blockIndex: number) => void;
  toggleResearchItem: (
    messageIndex: number,
    blockIndex: number,
    itemIndex: number
  ) => void;
  sendMessage: (value?: string) => Promise<void>;
  stop: () => void;
  setCurrentModel: (model: ChatModelId) => void;
};

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  input: "",
  pending: false,
  abortController: null,
  currentModel: DEFAULT_CHAT_MODEL_ID,
  pendingAttachments: [],
  setInput: (value) => set({ input: value }),
  setMessages: (messages) => set({ messages }),
  resetConversation: () =>
    set({
      messages: [],
      input: "",
      pending: false,
      pendingAttachments: [],
    }),
  clearConversation: () => {
    const { resetConversation } = get();
    resetConversation();
  },
  addAttachments: async (files) => {
    const items = Array.from(files || []);
    if (items.length === 0) {
      return;
    }

    const attachments: Attachment[] = [];

    for (const file of items) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        alert(
          `文件「${file.name}」超过限制（最大 ${(
            MAX_ATTACHMENT_SIZE /
            (1024 * 1024)
          ).toFixed(0)}MB），已跳过。`
        );
        continue;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        const mimeType = file.type || "application/octet-stream";
        attachments.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind: detectAttachmentKind(mimeType),
          name: file.name,
          size: file.size,
          mimeType,
          dataUrl,
        });
      } catch (error) {
        console.error(`无法读取文件「${file.name}」`, error);
        alert(`无法读取文件「${file.name}」，请重试。`);
      }
    }

    if (attachments.length === 0) {
      return;
    }

    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, ...attachments],
    }));
  },
  removeAttachment: (id) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(
        (item) => item.id !== id
      ),
    })),
  appendToAssistant: (addition) =>
    set((state) => {
      const next = [...state.messages];

      const ensureAssistantIndex = () => {
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
          return lastIndex;
        }
        next.push({ role: "assistant", blocks: [] });
        return next.length - 1;
      };

      const collapseLatestResearchBlock = (blocks: ContentBlock[]) => {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const block = blocks[i];
          if (block.type === "research" && block.isExpanded) {
            blocks[i] = { ...block, isExpanded: false };
            break;
          }
        }
      };

      if ("kind" in addition) {
        const assistantIndex = ensureAssistantIndex();
        const assistantMessage = next[assistantIndex];
        const blocks = [...assistantMessage.blocks];
        const lastBlock = blocks[blocks.length - 1];

        if (!lastBlock || lastBlock.type !== "research") {
          collapseLatestResearchBlock(blocks);
          const newItem = { ...addition, isExpanded: true };
          blocks.push({
            type: "research",
            items: [newItem],
            isExpanded: true,
          });
        } else {
          const items = [...lastBlock.items];
          const lastItem = items[items.length - 1];

          if (
            lastItem &&
            lastItem.kind === "thinking" &&
            addition.kind === "thinking"
          ) {
            items[items.length - 1] = {
              ...lastItem,
              text: lastItem.text + addition.text,
            };
          } else {
            if (lastItem) {
              items[items.length - 1] = {
                ...lastItem,
                isExpanded: false,
              };
            }
            items.push({ ...addition, isExpanded: true });
          }

          blocks[blocks.length - 1] = {
            ...lastBlock,
            items,
            isExpanded: true,
          };
        }

        next[assistantIndex] = { ...assistantMessage, blocks };
        return { messages: next };
      }

      if (addition.type === "research") {
        const assistantIndex = ensureAssistantIndex();
        const assistantMessage = next[assistantIndex];
        const blocks = [...assistantMessage.blocks];

        collapseLatestResearchBlock(blocks);

        const normalizedItems = addition.items.map((item, index) => ({
          ...item,
          isExpanded:
            addition.items.length > 0 && index === addition.items.length - 1,
        }));

        blocks.push({
          type: "research",
          items: normalizedItems,
          isExpanded: true,
        });

        next[assistantIndex] = { ...assistantMessage, blocks };
        return { messages: next };
      }

      if (addition.type !== "content") {
        return { messages: next };
      }

      const additionText = addition.content;
      if (!additionText) {
        return { messages: next };
      }

      const assistantIndex = ensureAssistantIndex();
      const assistantMessage = next[assistantIndex];
      const blocks = [...assistantMessage.blocks];

      // Collapse any open research block before appending the final response content.
      collapseLatestResearchBlock(blocks);

      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock?.type === "content") {
        blocks[blocks.length - 1] = {
          ...lastBlock,
          content: lastBlock.content + additionText,
        };
      } else {
        blocks.push({ type: "content", content: additionText });
      }

      next[assistantIndex] = { ...assistantMessage, blocks };
      return { messages: next };
    }),
  toggleResearchBlock: (messageIndex, blockIndex) => {
    const { messages } = get();
    if (messageIndex < 0 || messageIndex >= messages.length) {
      return;
    }
    const message = messages[messageIndex];
    if (!message) {
      return;
    }
    const block = message.blocks[blockIndex];
    if (!block || block.type !== "research") {
      return;
    }
    const next = [...messages];
    const blocks = [...message.blocks];
    blocks[blockIndex] = { ...block, isExpanded: !block.isExpanded };
    next[messageIndex] = { ...message, blocks };
    set({ messages: next });
  },
  toggleResearchItem: (messageIndex, blockIndex, itemIndex) => {
    const { messages } = get();
    if (messageIndex < 0 || messageIndex >= messages.length) {
      return;
    }
    const message = messages[messageIndex];
    if (!message) {
      return;
    }
    const block = message.blocks[blockIndex];
    if (!block || block.type !== "research") {
      return;
    }
    const item = block.items[itemIndex];
    if (!item) {
      return;
    }
    const next = [...messages];
    const blocks = [...message.blocks];
    const items = [...block.items];
    items[itemIndex] = { ...item, isExpanded: !item.isExpanded };
    blocks[blockIndex] = { ...block, items };
    next[messageIndex] = { ...message, blocks };
    set({ messages: next });
  },
  stop: () => {
    const { abortController } = get();
    if (!abortController) {
      return;
    }
    abortController.abort();
    set({ pending: false, abortController: null });
  },
  setCurrentModel: (model) => {
    set({ currentModel: model });
  },
  sendMessage: async (value) => {
    const trimmed = (value ?? get().input).trim();
    const attachments = get().pendingAttachments;
    if (get().pending) {
      return;
    }
    if (!trimmed && attachments.length === 0) {
      return;
    }

    const selectedModel = get().currentModel;

    const userBlocks: ContentBlock[] = [];
    if (trimmed) {
      userBlocks.push({ type: "content", content: trimmed });
    }
    if (attachments.length > 0) {
      userBlocks.push({ type: "attachments", attachments });
    }

    const userMessage: Message = {
      role: "user",
      blocks: userBlocks,
    };

    const controller = new AbortController();

    set((state) => ({
      messages: [...state.messages, userMessage],
      input: "",
      pending: true,
      abortController: controller,
      pendingAttachments: [],
    }));

    try {
      // 发送完整的 messages 给后端（包括刚添加的用户消息）
      const conversationHistory = get().messages;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationHistory,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Server refused the request");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("The server response could not be streamed");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.substring(6);
                const data = JSON.parse(jsonStr);

                console.log("Parsed data:", data);

                if (data.type === "thinking") {
                  get().appendToAssistant({
                    kind: "thinking",
                    text:
                      typeof data.content === "string"
                        ? data.content
                        : String(data.content ?? ""),
                    isExpanded: false,
                  });
                } else if (data.type === "tool_call") {
                  get().appendToAssistant({
                    kind: "tool_call",
                    tool:
                      typeof data.tool === "string" ? data.tool : "未知工具",
                    args: (data.args && typeof data.args === "object"
                      ? data.args
                      : {}) as Record<string, unknown>,
                    isExpanded: false,
                  });
                } else if (data.type === "tool_result") {
                  let resultText: string;
                  if (typeof data.result === "string") {
                    resultText = data.result;
                  } else {
                    try {
                      resultText = JSON.stringify(data.result, null, 2);
                    } catch {
                      resultText = String(data.result ?? "");
                    }
                  }
                  get().appendToAssistant({
                    kind: "tool_result",
                    tool:
                      typeof data.tool === "string" ? data.tool : "未知工具",
                    result: resultText,
                    isExpanded: false,
                  });
                } else if (data.type === "content") {
                  const addition =
                    typeof data.content === "string"
                      ? data.content
                      : String(data.content ?? "");
                  get().appendToAssistant({
                    type: "content",
                    content: addition,
                  });
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e, "line:", line);
              }
            }
          }
        }

        if (done) break;
      }

      reader.releaseLock();
    } catch (error) {
      const isAbortError =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError");
      if (isAbortError) {
        // Abort is user initiated; nothing to append.
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Unable to reach the chat API.";
      get().appendToAssistant({
        type: "content",
        content: `Error: ${message}`,
      });
    } finally {
      set({ pending: false, abortController: null });
    }
  },
}));
