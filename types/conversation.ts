import type { ContentBlock } from "@/src/features/chat/types/chat";

export type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  source?: "remote" | "local";
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  blocks: ContentBlock[];
  created_at: string;
};
