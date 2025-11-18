"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Composer } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/store/useChatStore";
import type {
  ConversationSummary,
  StoredConversation,
} from "@/utils/storage";
import {
  deriveTitleFromMessages,
  listConversations,
  loadConversation,
  saveConversation,
} from "@/utils/storage";

type ChatPageClientProps = {
  conversationId?: string;
};

function generateConversationId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export default function ChatPageClient({
  conversationId,
}: ChatPageClientProps) {
  const router = useRouter();
  const messages = useChatStore((state) => state.messages);
  const messageCount = messages.length;
  const pending = useChatStore((state) => state.pending);
  const setMessages = useChatStore((state) => state.setMessages);
  const resetConversation = useChatStore((state) => state.resetConversation);

  const isInitial = messageCount === 0;
  const canClearConversation = !pending && messageCount > 0;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const hasRedirected = useRef(false);
  const activeConversationRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const loadSummaries = async () => {
      const list = await listConversations();
      if (!cancelled) {
        setConversations(list);
      }
    };
    void loadSummaries();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!conversationId) {
        activeConversationRef.current = undefined;
        resetConversation();
        return;
      }

      if (activeConversationRef.current === conversationId) {
        return;
      }

      resetConversation();
      const stored = await loadConversation(conversationId);
      if (cancelled || !stored) {
        activeConversationRef.current = conversationId;
        return;
      }
      setMessages(stored.messages);
      activeConversationRef.current = conversationId;
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [conversationId, resetConversation, setMessages]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) {
      return;
    }
    let cancelled = false;

    const persist = async () => {
      const existing = await loadConversation(conversationId);
      if (cancelled) {
        return;
      }
      const now = Date.now();
      const payload: StoredConversation = {
        id: conversationId,
        messages,
        title: deriveTitleFromMessages(messages),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await saveConversation(payload);
      if (cancelled) {
        return;
      }
      const list = await listConversations();
      if (!cancelled) {
        setConversations(list);
      }
    };

    void persist();
    return () => {
      cancelled = true;
    };
  }, [conversationId, messages]);

  useEffect(() => {
    if (conversationId || hasRedirected.current) {
      return;
    }
    const firstMessage = messages[0];
    if (!firstMessage || firstMessage.role !== "user") {
      return;
    }

    hasRedirected.current = true;
    let cancelled = false;
    const now = Date.now();
    const newId = generateConversationId();
    activeConversationRef.current = newId;
    const payload: StoredConversation = {
      id: newId,
      messages,
      title: deriveTitleFromMessages(messages),
      createdAt: now,
      updatedAt: now,
    };

    const createConversation = async () => {
      await saveConversation(payload);
      if (cancelled) {
        return;
      }
      const list = await listConversations();
      if (cancelled) {
        return;
      }
      setConversations(list);
      router.replace(`/chat/${newId}`);
    };

    void createConversation();
    return () => {
      cancelled = true;
    };
  }, [conversationId, messages, router]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (!id || id === conversationId) {
        return;
      }
      router.push(`/chat/${id}`);
    },
    [conversationId, router]
  );

  const handleNewConversation = useCallback(() => {
    hasRedirected.current = false;
    activeConversationRef.current = undefined;
    resetConversation();
    router.push("/");
  }, [resetConversation, router]);

  const handleClearConversation = useCallback(() => {
    if (!canClearConversation) {
      return;
    }
    handleNewConversation();
  }, [canClearConversation, handleNewConversation]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        canClearConversation={canClearConversation}
        onClear={handleClearConversation}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-col ">
          <main className="relative flex-1 min-h-0">
            <MessageList />
            <Composer isInitial={isInitial} />
          </main>
        </div>
      </div>
    </div>
  );
}
