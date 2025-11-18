import { Message } from "@/types/chat";

export type ConversationId = string;

export type StoredConversation = {
  id: ConversationId;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type ConversationSummary = {
  id: ConversationId;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
};

const DB_NAME = "chat_db";
const DB_VERSION = 1;
const CONVERSATIONS_STORE = "conversations";
const CONVERSATION_INDEX_STORE = "conversation_index";

type StoreName =
  | typeof CONVERSATIONS_STORE
  | typeof CONVERSATION_INDEX_STORE;

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBAvailable() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined"
  );
}

export async function openDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          db.createObjectStore(CONVERSATIONS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(CONVERSATION_INDEX_STORE)) {
          db.createObjectStore(CONVERSATION_INDEX_STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Failed to open IndexedDB"));
      };
    });
  }

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IDB request failed"));
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);

  const txPromise = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });

  let result: T;
  try {
    result = await work(store);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // ignore abort errors - transaction may already be closed
    }
    throw error;
  }

  await txPromise;
  return result;
}

export function deriveTitleFromMessages(messages: Message[]) {
  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }
    const content = message.blocks
      .filter((block) => block.type === "content")
      .map((block) => block.content.trim())
      .join(" ")
      .trim();
    if (content.length > 0) {
      return content.length > 30 ? `${content.slice(0, 30)}...` : content;
    }
  }
  return "新的对话";
}

export async function loadConversationIndex(): Promise<ConversationSummary[]> {
  try {
    const summaries = await withStore(
      CONVERSATION_INDEX_STORE,
      "readonly",
      async (store) => {
        const request = store.getAll();
        const result = await requestToPromise(request);
        return Array.isArray(result)
          ? (result as ConversationSummary[])
          : [];
      }
    );
    return summaries ?? [];
  } catch (error) {
    console.error("Failed to load conversation index", error);
    return [];
  }
}

export async function saveConversationIndex(
  index: ConversationSummary[]
): Promise<void> {
  try {
    await withStore(CONVERSATION_INDEX_STORE, "readwrite", async (store) => {
      await requestToPromise(store.clear());
      for (const summary of index) {
        await requestToPromise(store.put(summary));
      }
    });
  } catch (error) {
    console.error("Failed to save conversation index", error);
  }
}

export async function upsertConversationSummary(
  summary: ConversationSummary
): Promise<void> {
  try {
    await withStore(CONVERSATION_INDEX_STORE, "readwrite", async (store) => {
      await requestToPromise(store.put(summary));
    });
  } catch (error) {
    console.error("Failed to upsert conversation summary", error);
  }
}

export async function deleteConversationSummary(
  id: ConversationId
): Promise<void> {
  try {
    await withStore(CONVERSATION_INDEX_STORE, "readwrite", async (store) => {
      await requestToPromise(store.delete(id));
    });
  } catch (error) {
    console.error("Failed to delete conversation summary", error);
  }
}

export async function loadConversation(
  id: ConversationId
): Promise<StoredConversation | null> {
  try {
    const data = await withStore(
      CONVERSATIONS_STORE,
      "readonly",
      async (store) => {
        const request = store.get(id);
        return (await requestToPromise(request)) as
          | StoredConversation
          | undefined;
      }
    );
    return data ?? null;
  } catch (error) {
    console.error("Failed to load conversation", error);
    return null;
  }
}

export async function saveConversation(
  conversation: StoredConversation
): Promise<void> {
  const now = Date.now();
  const title = conversation.title?.trim().length
    ? conversation.title
    : deriveTitleFromMessages(conversation.messages);
  const normalized: StoredConversation = {
    ...conversation,
    title,
    createdAt: conversation.createdAt ?? now,
    updatedAt: conversation.updatedAt ?? now,
  };

  try {
    await withStore(CONVERSATIONS_STORE, "readwrite", async (store) => {
      await requestToPromise(store.put(normalized));
    });

    await upsertConversationSummary({
      id: normalized.id,
      title: normalized.title,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      messageCount: normalized.messages.length,
    });
  } catch (error) {
    console.error("Failed to save conversation", error);
  }
}

export async function deleteConversation(id: ConversationId): Promise<void> {
  try {
    await withStore(CONVERSATIONS_STORE, "readwrite", async (store) => {
      await requestToPromise(store.delete(id));
    });
    await deleteConversationSummary(id);
  } catch (error) {
    console.error("Failed to delete conversation", error);
  }
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const conversations = await loadConversationIndex();
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}
