import {
  ContentBlock,
  Message,
  ResearchItem,
} from "@/src/features/chat/types/chat";

export type StreamToolCall = {
  index?: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: unknown;
  toolCalls?: StreamToolCall[];
  toolCallId?: string;
  name?: string;
};

export const buildSystemPrompt = (searchEnabled: boolean = true) => {
  const basePrompt = `
今天的日期是：${new Date().toISOString().slice(0, 10)}
`;

  if (!searchEnabled) {
    return basePrompt;
  }

  return `${basePrompt}
# 需要搜索的时候：非必要情况下不要用中文搜索；在没有足够上下文之前不要回答；如果没有搞清楚，就不断调研直到搞清楚，不要只是了解皮毛，要深入搜索资料去了解，要了解全方位的资料搜寻才能开始回答。

# 什么时候不需要搜索：已知的知识

- 搜索工具使用技法：多次组合不同关键词进行多次搜索
- 获取更详细的信息：fetch 特定网页
`;
};

export const buildConversationTitle = (message: Message) => {
  const text = message.blocks
    .filter((b) => b.type === "content")
    .map((b) => b.content)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return "新会话";
  }

  const normalized = text.replace(/\r?\n/g, " ").trim();
  return normalized.length > 50 ? `${normalized.slice(0, 50)}...` : normalized;
};

export const toChatMessages = (history: Message[]): ChatMessage[] =>
  history
    .map((msg) => {
      const relevantBlocks = msg.blocks.filter(
        (block) => block.type === "content" || block.type === "attachments"
      );

      const contentParts: unknown[] = [];

      for (const block of relevantBlocks) {
        if (block.type === "content") {
          contentParts.push({
            type: "text",
            text: block.content,
          });
        } else if (block.type === "attachments") {
          for (const att of block.attachments) {
            const base64Data = att.dataUrl.split(",")[1] || att.dataUrl;

            if (att.kind === "image") {
              contentParts.push({
                type: "image_url",
                imageUrl: { url: att.dataUrl },
              });
            } else if (att.kind === "video") {
              contentParts.push({
                type: "video_url",
                videoUrl: { url: att.dataUrl },
              });
            } else if (att.kind === "audio") {
              const format = att.mimeType.split("/")[1]?.split(";")[0] || "wav";
              contentParts.push({
                type: "input_audio",
                inputAudio: { data: base64Data, format },
              });
            } else {
              contentParts.push({
                type: "file",
                file: { filename: att.name, fileData: att.dataUrl },
              });
            }
          }
        }
      }

      return {
        role: msg.role,
        content: contentParts,
      };
    })
    .filter((msg) => {
      if (msg.role !== "assistant") {
        return true;
      }
      return Array.isArray(msg.content) && msg.content.length > 0;
    });

export const buildAssistantBlocks = (
  items: ResearchItem[],
  content: string | null
): ContentBlock[] => {
  const blocks: ContentBlock[] = [];
  if (items.length > 0) {
    blocks.push({ type: "research", items });
  }
  if (content) {
    blocks.push({ type: "content", content });
  }
  return blocks;
};