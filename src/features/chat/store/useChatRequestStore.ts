import { create } from "zustand";
import { toast } from "@/src/shared/toast";
import type { ChatClient } from "@/src/features/chat/lib/network";
import { startChatRequest } from "@/src/features/chat/lib/network";
import type { SelectedSearchTool } from "@/src/features/chat/types/chat";
import {
  buildUserBlocks,
  computeMessagesFromPath,
} from "@/src/features/chat/lib/tree";
import { useComposerStore } from "./useComposerStore";
import { useMessageTreeStore } from "./useMessageTreeStore";
import { useEditingStore } from "./useEditingStore";

type ChatRequestState = {
  pending: boolean;
  chatClient: ChatClient | null;
  activeRequestId: string | null;
  currentModel: string;
  selectedSearchTool: SelectedSearchTool;
  systemInstruction: string;
};

type ChatRequestActions = {
  sendMessage: (navigate?: (path: string) => void) => Promise<void>;
  stop: () => void;
  setCurrentModel: (model: string) => void;
  setSelectedSearchTool: (tool: SelectedSearchTool) => void;
  setSystemInstruction: (instruction: string) => void;
  clear: () => void;
  _setPending: (pending: boolean) => void;
  _setChatClient: (client: ChatClient | null) => void;
  _setActiveRequestId: (id: string | null) => void;
};

const SEARCH_TOOL_STORAGE_KEY = "selected-search-tool";

const isValidSearchTool = (value: string): value is SelectedSearchTool =>
  value === "none" ||
  value === "brave_search" ||
  value === "serp_search" ||
  value === "tavily_search";

const getInitialSearchTool = (): SelectedSearchTool => {
  if (typeof window === "undefined") {
    return "none";
  }

  const stored = window.localStorage.getItem(SEARCH_TOOL_STORAGE_KEY);
  if (stored && isValidSearchTool(stored)) {
    return stored;
  }

  return "none";
};

export const useChatRequestStore = create<ChatRequestState & ChatRequestActions>(
  (set, get) => ({
    pending: false,
    chatClient: null,
    activeRequestId: null,
    currentModel: "",
    selectedSearchTool: getInitialSearchTool(),
    systemInstruction: "",
    sendMessage: async (navigate) => {
      const { input, pendingAttachments } = useComposerStore.getState();
      const trimmed = input.trim();
      const selectedModel = get().currentModel;

      if (get().pending) {
        return;
      }
      if (!trimmed && pendingAttachments.length === 0) {
        return;
      }
      if (!selectedModel) {
        toast.warning("请先选择模型");
        return;
      }

      const treeStore = useMessageTreeStore.getState();
      const result = treeStore._addMessage(
        "user",
        buildUserBlocks(input, pendingAttachments)
      );

      const pathMessages = computeMessagesFromPath(
        result.messages,
        result.currentPath
      );

      useComposerStore.setState({ input: "", pendingAttachments: [] });

      const { get: getRequestState, set: setRequestState } =
        getChatRequestHandlers();

      await startChatRequest(getRequestState, setRequestState, {
        messages: pathMessages,
        navigate,
        titleSource: { role: "user", blocks: result.addedMessage.blocks },
      });
    },
    stop: () => {
      const { chatClient } = get();
      if (!chatClient) {
        set({ pending: false, chatClient: null, activeRequestId: null });
        return;
      }
      chatClient.abort();
      set({ pending: false, chatClient: null, activeRequestId: null });
    },
    setCurrentModel: (model) => {
      set({ currentModel: model });
      useEditingStore.getState().setCurrentModel(model);
    },
    setSelectedSearchTool: (tool) => {
      set({ selectedSearchTool: tool });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SEARCH_TOOL_STORAGE_KEY, tool);
      }
    },
    setSystemInstruction: (instruction) =>
      set({ systemInstruction: instruction }),
    clear: () => {
      const client = get().chatClient;
      if (client) {
        client.abort();
      }
      set({
        pending: false,
        chatClient: null,
        activeRequestId: null,
      });
    },
    _setPending: (pending) => set({ pending }),
    _setChatClient: (chatClient) => set({ chatClient }),
    _setActiveRequestId: (activeRequestId) => set({ activeRequestId }),
  })
);

const buildStoreStateSnapshot = () => {
  const treeState = useMessageTreeStore.getState();
  const requestState = useChatRequestStore.getState();
  return {
    messages: treeState.messages,
    currentPath: treeState.currentPath,
    conversationId: treeState.conversationId,
    pending: requestState.pending,
    chatClient: requestState.chatClient,
    activeRequestId: requestState.activeRequestId,
  };
};

const applyRequestPartial = (
  partial: Partial<ReturnType<typeof buildStoreStateSnapshot>>
) => {
  const treeStore = useMessageTreeStore.getState();
  const nextRequestState: Partial<ChatRequestState> = {};

  if (Object.prototype.hasOwnProperty.call(partial, "pending")) {
    nextRequestState.pending = partial.pending ?? false;
  }
  if (Object.prototype.hasOwnProperty.call(partial, "chatClient")) {
    nextRequestState.chatClient = partial.chatClient ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(partial, "activeRequestId")) {
    nextRequestState.activeRequestId = partial.activeRequestId ?? null;
  }

  if (Object.keys(nextRequestState).length > 0) {
    useChatRequestStore.setState(nextRequestState);
  }

  if (Object.prototype.hasOwnProperty.call(partial, "conversationId")) {
    treeStore.setConversationId(partial.conversationId ?? null);
  }
};

export const getChatRequestHandlers = () => {
  const getRequestState = () => {
    const treeState = useMessageTreeStore.getState();
    const requestState = useChatRequestStore.getState();
    return {
      messages: treeState.messages,
      currentPath: treeState.currentPath,
      conversationId: treeState.conversationId,
      currentModel: requestState.currentModel,
      selectedSearchTool: requestState.selectedSearchTool,
      systemInstruction: requestState.systemInstruction,
      pending: requestState.pending,
      activeRequestId: requestState.activeRequestId,
      appendToAssistant: treeState.appendToAssistant,
    };
  };

  const setRequestState = (
    partial:
      | Partial<ReturnType<typeof buildStoreStateSnapshot>>
      | ((state: ReturnType<typeof buildStoreStateSnapshot>) => Partial<
          ReturnType<typeof buildStoreStateSnapshot>
        >)
  ) => {
    if (typeof partial === "function") {
      const snapshot = buildStoreStateSnapshot();
      const resolved = partial(snapshot);
      applyRequestPartial(resolved);
      return;
    }
    applyRequestPartial(partial);
  };

  return { get: getRequestState, set: setRequestState };
};
