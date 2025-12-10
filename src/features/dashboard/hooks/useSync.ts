"use client";

import { useCallback, useState } from "react";
import { localDB } from "@/src/shared/lib/indexed-db";
import type { SyncResponse } from "@/src/features/dashboard/types";
import { useConversationsStore } from "@/src/features/sidebar/store/useConversationsStore";

type UseSyncReturn = {
  sync: () => Promise<SyncResponse | null>;
  syncing: boolean;
  error: string | null;
  result: SyncResponse | null;
};

export function useSync(): UseSyncReturn {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResponse | null>(null);

  const sync = useCallback(async () => {
    if (syncing) return result;

    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const { conversations, messages } = await localDB.getAllData();

      const messagesByConversation = new Map<string, typeof messages>();

      for (const msg of messages) {
        const list = messagesByConversation.get(msg.conversation_id) ?? [];
        list.push(msg);
        messagesByConversation.set(msg.conversation_id, list);
      }

      const payload = {
        conversations: conversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          messages: (messagesByConversation.get(conv.id) ?? []).map((msg) => ({
            id: msg.id,
            role: msg.role,
            blocks: msg.blocks,
            created_at: msg.created_at,
          })),
        })),
      };

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { errors?: string[] }
          | null;
        const message = data?.errors?.[0] ?? "同步失败，请稍后重试。";
        setError(message);
        setSyncing(false);
        return null;
      }

      const data = (await response.json()) as SyncResponse;
      setResult(data);

      if (data.success) {
        await useConversationsStore.getState().clearLocal();
      }

      setSyncing(false);
      return data;
    } catch (err) {
      console.error("[Sync] Failed to sync local conversations:", err);
      setError("同步失败，请稍后重试。");
      setSyncing(false);
      return null;
    }
  }, [syncing, result]);

  return { sync, syncing, error, result };
}
