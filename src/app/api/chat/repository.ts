import { SupabaseClient } from "@supabase/supabase-js";
import { ContentBlock, Message } from "@/src/features/chat/types/chat";
import { buildConversationTitle } from "@/src/shared/utils/chatFormat";

export type SavedMessageIds = {
  userMessageId: string | null;
  assistantMessageId: string | null;
  userCreatedAt: string | null;
  assistantCreatedAt: string | null;
};

export type ConversationCreatedEvent = {
  type: "conversation_created";
  conversationId: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const generateMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const saveMessages = async (
  supabase: SupabaseClient,
  conversationId: string,
  userMessage: Message,
  assistantBlocks: ContentBlock[],
  messageIds: SavedMessageIds
) => {
  const now = new Date().toISOString();
  const nextIds: SavedMessageIds = {
    userMessageId: messageIds.userMessageId ?? generateMessageId(),
    assistantMessageId:
      assistantBlocks.length > 0
        ? messageIds.assistantMessageId ?? generateMessageId()
        : messageIds.assistantMessageId,
    userCreatedAt: messageIds.userCreatedAt ?? now,
    assistantCreatedAt:
      assistantBlocks.length > 0
        ? messageIds.assistantCreatedAt ?? now
        : messageIds.assistantCreatedAt,
  };

  const rows = [
    {
      id: nextIds.userMessageId,
      conversation_id: conversationId,
      role: "user",
      blocks: userMessage.blocks,
      created_at: nextIds.userCreatedAt,
    },
  ];

  if (assistantBlocks.length > 0) {
    rows.push({
      id: nextIds.assistantMessageId,
      conversation_id: conversationId,
      role: "assistant",
      blocks: assistantBlocks,
      created_at: nextIds.assistantCreatedAt,
    });
  }

  const { error: upsertError } = await supabase
    .from("messages")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    console.error("[Chat-API] Failed to save messages:", {
      conversationId,
      userMessageId: nextIds.userMessageId,
      assistantMessageId: nextIds.assistantMessageId,
      error: upsertError.message,
    });
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversationId);

  if (updateError) {
    console.error("[Chat-API] Failed to update conversation timestamp:", {
      conversationId,
      error: updateError.message,
    });
  }

  messageIds.userMessageId = nextIds.userMessageId;
  messageIds.assistantMessageId = nextIds.assistantMessageId ?? null;
  messageIds.userCreatedAt = nextIds.userCreatedAt;
  messageIds.assistantCreatedAt = nextIds.assistantCreatedAt ?? null;
};

export const ensureConversation = async (
  supabase: SupabaseClient,
  supabaseUser: { id: string },
  activeConversationId: string | null,
  latestUserMessage: Message
): Promise<{
  conversationId: string | null;
  event: ConversationCreatedEvent | null;
}> => {
  if (!activeConversationId) {
    return { conversationId: null, event: null };
  }

  const { data: existingConversation, error: existingConversationError } =
    await supabase
      .from("conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

  if (existingConversationError) {
    console.error(
      "[Chat-API] Failed to verify conversation:",
      existingConversationError.message
    );
    return { conversationId: null, event: null };
  }

  if (!existingConversation) {
    const title = buildConversationTitle(latestUserMessage);
    const now = new Date().toISOString();
    const { error: createConversationError } = await supabase
      .from("conversations")
      .insert({
        id: activeConversationId,
        user_id: supabaseUser.id,
        title,
        created_at: now,
        updated_at: now,
      });

    if (createConversationError) {
      console.error(
        "[Chat-API] Failed to create conversation:",
        createConversationError.message
      );
      return { conversationId: null, event: null };
    }

    return {
      conversationId: activeConversationId,
      event: {
        type: "conversation_created",
        conversationId: activeConversationId,
        title,
        user_id: supabaseUser.id,
        created_at: now,
        updated_at: now,
      },
    };
  }

  return { conversationId: activeConversationId, event: null };
};
