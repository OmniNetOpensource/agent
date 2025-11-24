import { FormEvent, KeyboardEvent, useCallback } from "react";
import { useChatStore } from "@/src/features/chat/store/useChatStore";

export function useChatMessages() {
  const messages = useChatStore((state) => state.messages);
  const pending = useChatStore((state) => state.pending);

  return {
    messages,
    pending,
  };
}

export function useChatComposer() {
  const input = useChatStore((state) => state.input);
  const pending = useChatStore((state) => state.pending);
  const setInput = useChatStore((state) => state.setInput);
  const pendingAttachments = useChatStore(
    (state) => state.pendingAttachments
  );
  const addAttachments = useChatStore((state) => state.addAttachments);
  const removeAttachment = useChatStore((state) => state.removeAttachment);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const stop = useChatStore((state) => state.stop);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await sendMessage();
    },
    [sendMessage]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  return {
    input,
    pending,
    setInput,
    pendingAttachments,
    addAttachments,
    removeAttachment,
    sendMessage,
    stop,
    handleSubmit,
    handleKeyDown,
  };
}

export function useChat() {
  const messageSlice = useChatMessages();
  const composerSlice = useChatComposer();
  const clearConversation = useChatStore((state) => state.clearConversation);

  return {
    ...messageSlice,
    ...composerSlice,
    clearConversation,
  };
}
