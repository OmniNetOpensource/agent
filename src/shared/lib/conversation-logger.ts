import fs from "fs";
import path from "path";

export type ConversationLogger = {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const LOG_BASE_DIR = path.join(process.cwd(), "logs", "conversations");

const ensureLogDirectory = () => {
  try {
    if (!fs.existsSync(LOG_BASE_DIR)) {
      fs.mkdirSync(LOG_BASE_DIR, { recursive: true });
    }
  } catch (error) {
    console.error(
      "[ConversationLogger] Failed to ensure log directory:",
      error
    );
  }
};

const normalizeConversationId = (conversationId: string | null | undefined) => {
  const rawId =
    typeof conversationId === "string" && conversationId.trim().length > 0
      ? conversationId
      : `session_${Date.now()}`;

  return rawId.replace(/[^a-zA-Z0-9_-]/g, "_");
};

const safeSerialize = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    const errorInfo = {
      ...value, // 1. 先展开其他可能的自定义属性
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: (value as { cause?: unknown }).cause, // 2. 使用更安全的类型断言替代 any
    };
    try {
      return JSON.stringify(errorInfo);
    } catch {
      return `[Error: ${value.message}]`;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unserializable]";
    }
  }
};

export const createConversationLogger = (
  conversationId: string | null | undefined
): ConversationLogger => {
  const shouldWriteToFile = process.env.NODE_ENV !== "production";

  if (shouldWriteToFile) {
    ensureLogDirectory();
  }

  const safeId = normalizeConversationId(conversationId);
  const filePath = path.join(LOG_BASE_DIR, `${safeId}.log`);

  const appendLine = (level: "INFO" | "ERROR", args: unknown[]) => {
    if (!shouldWriteToFile) {
      return;
    }

    const timestamp = new Date().toISOString();
    const text = args.map(safeSerialize).join(" ");
    const line = `[${timestamp}] [${level}] ${text}\n`;

    try {
      fs.appendFile(filePath, line, (err) => {
        if (err) {
          console.error("[ConversationLogger] Failed to write log:", err);
        }
      });
    } catch (error) {
      console.error("[ConversationLogger] Unexpected logging error:", error);
    }
  };

  return {
    log: (...args: unknown[]) => {
      appendLine("INFO", args);
      console.log(...args);
    },
    error: (...args: unknown[]) => {
      appendLine("ERROR", args);
      console.error(...args);
    },
  };
};
