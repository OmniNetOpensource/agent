import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Message, MessageTree } from "@/src/features/chat/types/chat";

const DB_NAME = "aether_local";
const DB_VERSION = 3;
const STORE_CONVERSATIONS = "conversations";

export type LocalConversation = {
  id: string;
  title: string | null;
  messageTree?: MessageTree;
  messages?: Message[];
  created_at: string;
  updated_at: string;
  pinned?: boolean;
  pinned_at?: string;
};

interface AetherDB extends DBSchema {
  conversations: {
    key: string;
    value: LocalConversation;
    indexes: { updated_at: string; pinned_at: string };
  };
  // Legacy store kept in typing so upgrade can safely delete it.
  messages: {
    key: string;
    value: unknown;
  };
}

const supportsIndexedDB =
  typeof indexedDB !== "undefined" && typeof indexedDB.open === "function";

let dbPromise: Promise<IDBPDatabase<AetherDB>> | null = null;

const openDatabase = async (): Promise<IDBPDatabase<AetherDB>> => {
  if (!supportsIndexedDB) {
    throw new Error("IndexedDB is not available in this environment");
  }

  if (!dbPromise) {
    dbPromise = openDB<AetherDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 2) {
          if (db.objectStoreNames.contains("messages")) {
            db.deleteObjectStore("messages");
          }
          if (db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
            db.deleteObjectStore(STORE_CONVERSATIONS);
          }
          const store = db.createObjectStore(STORE_CONVERSATIONS, {
            keyPath: "id",
          });
          store.createIndex("updated_at", "updated_at");
          store.createIndex("pinned_at", "pinned_at");
        }
        if (oldVersion < 3) {
          const store = transaction?.objectStore(STORE_CONVERSATIONS);
          if (store && !store.indexNames.contains("pinned_at")) {
            store.createIndex("pinned_at", "pinned_at");
          }
        }
      },
    });
  }

  return dbPromise;
};

export const localDB = {
  async getAll(): Promise<LocalConversation[]> {
    if (!supportsIndexedDB) {
      return [];
    }

    const db = await openDatabase();
    const all = await db.getAll(STORE_CONVERSATIONS);
    return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async get(id: string): Promise<LocalConversation | undefined> {
    if (!supportsIndexedDB) {
      return undefined;
    }

    const db = await openDatabase();
    return db.get(STORE_CONVERSATIONS, id);
  },

  async save(conversation: LocalConversation): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }

    const db = await openDatabase();
    await db.put(STORE_CONVERSATIONS, conversation);
  },

  async delete(id: string): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }

    const db = await openDatabase();
    await db.delete(STORE_CONVERSATIONS, id);
  },

  async clear(): Promise<void> {
    if (!supportsIndexedDB) {
      return;
    }

    const db = await openDatabase();
    await db.clear(STORE_CONVERSATIONS);
  },
};
