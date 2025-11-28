import type { DbMessage } from "@/types/conversation";
import type { Message } from "@/src/features/chat/types/chat";

export async function fetchConversationMessages(id: string): Promise<Message[]> {
  const response = await fetch(`/api/conversations/${id}/messages`, {
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  const data = (await response.json()) as { messages?: DbMessage[] };
  const normalized: Message[] = (data.messages ?? []).map((msg) => ({
    role: msg.role,
    blocks: Array.isArray(msg.blocks)
      ? msg.blocks.map((block) =>
          block.type === "research"
            ? {
                ...block,
                items: block.items.map((item) => ({ ...item })),
              }
            : { ...block }
        )
      : [],
  }));

  return normalized;
}