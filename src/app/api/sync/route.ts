import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { ContentBlock } from "@/src/features/chat/types/chat";

type SyncRequestMessage = {
  id: string;
  role: "user" | "assistant";
  blocks: ContentBlock[];
  created_at: string;
};

type SyncRequestConversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: SyncRequestMessage[];
};

type SyncRequest = {
  conversations: SyncRequestConversation[];
};

type SyncResponse = {
  success: boolean;
  syncedConversations: number;
  syncedMessages: number;
  errors?: string[];
};

const generateMessageId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export async function POST(req: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json<SyncResponse>(
      {
        success: false,
        syncedConversations: 0,
        syncedMessages: 0,
        errors: ["Supabase is not configured"],
      },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<SyncResponse>(
      {
        success: false,
        syncedConversations: 0,
        syncedMessages: 0,
        errors: ["Unauthorized"],
      },
      { status: 401 }
    );
  }

  let body: SyncRequest;
  try {
    body = (await req.json()) as SyncRequest;
  } catch {
    return NextResponse.json<SyncResponse>(
      {
        success: false,
        syncedConversations: 0,
        syncedMessages: 0,
        errors: ["Invalid JSON body"],
      },
      { status: 400 }
    );
  }

  const conversations = Array.isArray(body.conversations)
    ? body.conversations
    : [];

  if (!conversations.length) {
    return NextResponse.json<SyncResponse>({
      success: true,
      syncedConversations: 0,
      syncedMessages: 0,
    });
  }

  const conversationRows = [];
  const messageRows = [];

  for (const conv of conversations) {
    if (!conv || !conv.id) {
      continue;
    }

    const createdAt = conv.created_at || new Date().toISOString();
    const updatedAt = conv.updated_at || createdAt;

    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const beforeCount = messageRows.length;
    for (const msg of messages) {
      if (!msg) continue;

      const createdAtMsg = msg.created_at || createdAt;

      messageRows.push({
        id: generateMessageId(),
        conversation_id: conv.id,
        role: msg.role,
        blocks: msg.blocks ?? [],
        created_at: createdAtMsg,
      });
    }

    // Skip syncing conversations that have no messages.
    if (messageRows.length === beforeCount) {
      continue;
    }

    conversationRows.push({
      id: conv.id,
      user_id: user.id,
      title: conv.title ?? "新会话",
      created_at: createdAt,
      updated_at: updatedAt,
    });
  }

  if (!conversationRows.length) {
    return NextResponse.json<SyncResponse>({
      success: true,
      syncedConversations: 0,
      syncedMessages: 0,
    });
  }

  const errors: string[] = [];

  const { error: convError } = await supabase
    .from("conversations")
    .insert(conversationRows);

  if (convError) {
    console.error("[Sync] Failed to insert conversations:", convError.message);
    errors.push("Failed to insert conversations");
  }

  if (messageRows.length > 0) {
    const { error: msgError } = await supabase
      .from("messages")
      .insert(messageRows);

    if (msgError) {
      console.error("[Sync] Failed to insert messages:", msgError.message);
      errors.push("Failed to insert messages");
    }
  }

  const success = errors.length === 0;

  return NextResponse.json<SyncResponse>({
    success,
    syncedConversations: conversationRows.length,
    syncedMessages: messageRows.length,
    errors: errors.length ? errors : undefined,
  });
}
