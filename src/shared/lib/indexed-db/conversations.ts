import type { ContentBlock } from "@/src/features/chat/types/chat";

const DB_NAME = "aether_local";
const DB_VERSION = 1;
const STORE_CONVERSATIONS = "conversations";
const STORE_MESSAGES = "messages";

export type LocalConversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  blocks: ContentBlock[];
  created_at: string;
};

const supportsIndexedDB =
  typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (!supportsIndexedDB) {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment")
    );
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const conversationsStore = db.createObjectStore(STORE_CONVERSATIONS, {
          keyPath: "id",
        });
        conversationsStore.createIndex("updated_at", "updated_at", {
          unique: false,
        });
      } else {
        const tx = request.transaction;
        if (tx) {
          const store = tx.objectStore(STORE_CONVERSATIONS);
          if (!store.indexNames.contains("updated_at")) {
            store.createIndex("updated_at", "updated_at", { unique: false });
          }
        }
      }

      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const messagesStore = db.createObjectStore(STORE_MESSAGES, {
          keyPath: "id",
        });
        messagesStore.createIndex("conversation_id", "conversation_id", {
          unique: false,
        });
      } else {
        const tx = request.transaction;
        if (tx) {
          const store = tx.objectStore(STORE_MESSAGES);
          if (!store.indexNames.contains("conversation_id")) {
            store.createIndex("conversation_id", "conversation_id", {
              unique: false,
            });
          }
        }
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
};

const getAllFromStore = <T>(
  storeName: string,
  indexName?: string,
  query?: IDBValidKey | IDBKeyRange | null
): Promise<T[]> => {
  if (!supportsIndexedDB) {
    return Promise.resolve([]);
  }

  return openDatabase().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const source =
          indexName && store.indexNames.contains(indexName)
            ? store.index(indexName)
            : store;
        const request = query
          ? source.getAll(query as IDBValidKey)
          : source.getAll();

        request.onsuccess = () => {
          resolve((request.result as T[]) ?? []);
        };
        request.onerror = () => {
          reject(request.error ?? new Error("Failed to read from IndexedDB"));
        };
      })
  );
};

const countFromStore = (storeName: string): Promise<number> => {
  if (!supportsIndexedDB) {
    return Promise.resolve(0);
  }

  return openDatabase().then(
    (db) =>
      new Promise<number>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => {
          resolve(request.result ?? 0);
        };
        request.onerror = () => {
          reject(request.error ?? new Error("Failed to count records"));
        };
      })
  );
};

export const localDB = {
  init(): Promise<IDBDatabase> {
    if (!supportsIndexedDB) {
      return Promise.reject(
        new Error("IndexedDB is not available in this environment")
      );
    }
    return openDatabase();
  },

  async getConversations(): Promise<LocalConversation[]> {
    const items = await getAllFromStore<LocalConversation>(
      STORE_CONVERSATIONS,
      "updated_at"
    );
    return items.sort((a, b) => {
      if (!a.updated_at && !b.updated_at) return 0;
      if (!a.updated_at) return 1;
      if (!b.updated_at) return -1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  },

  async getConversation(id: string): Promise<LocalConversation | null> {
    if (!supportsIndexedDB) {
      return null;
    }
    const db = await openDatabase();
    return await new Promise<LocalConversation | null>((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, "readonly");
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as LocalConversation | undefined;
        resolve(result ?? null);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to read conversation"));
      };
    });
  },

  async saveConversation(conversation: LocalConversation): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, "readwrite");
      const store = tx.objectStore(STORE_CONVERSATIONS);
      store.put(conversation);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to save conversation"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Failed to save conversation"));
    });
  },

  async deleteConversation(id: string): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }

    const db = await openDatabase();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, "readwrite");
      const store = tx.objectStore(STORE_CONVERSATIONS);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to delete conversation"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Failed to delete conversation"));
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, "readwrite");
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index("conversation_id");
      const range = IDBKeyRange.only(id);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
          return;
        }
        resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Failed to delete messages"));
      };
    });
  },

  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    const range = IDBKeyRange.only(conversationId);
    const messages = await getAllFromStore<LocalMessage>(
      STORE_MESSAGES,
      "conversation_id",
      range
    );
    return messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async saveMessage(message: LocalMessage): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MESSAGES, "readwrite");
      const store = tx.objectStore(STORE_MESSAGES);
      store.put(message);

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to save message"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Failed to save message"));
    });
  },

  async getStats(): Promise<{
    conversationCount: number;
    messageCount: number;
  }> {
    const [conversationCount, messageCount] = await Promise.all([
      countFromStore(STORE_CONVERSATIONS),
      countFromStore(STORE_MESSAGES),
    ]);

    return { conversationCount, messageCount };
  },

  async getAllData(): Promise<{
    conversations: LocalConversation[];
    messages: LocalMessage[];
  }> {
    if (!supportsIndexedDB) {
      return { conversations: [], messages: [] };
    }

    const [conversations, messages] = await Promise.all([
      getAllFromStore<LocalConversation>(STORE_CONVERSATIONS),
      getAllFromStore<LocalMessage>(STORE_MESSAGES),
    ]);

    return { conversations, messages };
  },

  async clearAll(): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }

    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_CONVERSATIONS, STORE_MESSAGES],
        "readwrite"
      );
      const convStore = tx.objectStore(STORE_CONVERSATIONS);
      const msgStore = tx.objectStore(STORE_MESSAGES);
      convStore.clear();
      msgStore.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to clear IndexedDB"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("Failed to clear IndexedDB"));
    });
  },
};

