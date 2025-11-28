import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import ConversationClient from "./ConversationClient";
import type {
  Message,
  ResearchItem,
} from "@/src/features/chat/types/chat";
import type { Conversation } from "@/types/conversation";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  if (conversationId === "new") {
    return <ConversationClient conversationId={null} initialMessages={[]} />;
  }

  if (!hasSupabaseConfig()) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/c/new");
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select(
      "id, user_id, title, created_at, updated_at, messages(id, conversation_id, role, blocks, created_at)"
    )
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true, foreignTable: "messages" })
    .maybeSingle();

  if (convError || !conversation) {
    notFound();
  }

  const normalizedMessages: Message[] = (conversation.messages ?? []).map((message) => ({
    role: message.role,
    blocks: Array.isArray(message.blocks)
      ? message.blocks.map((block) =>
          block.type === "research"
            ? {
                ...block,
                items: block.items.map((item: ResearchItem) => ({ ...item })),
              }
            : { ...block }
        )
      : [],
  }));

  return (
    <ConversationClient
      conversationId={conversationId}
      initialMessages={normalizedMessages}
      conversation={{
        id: conversation.id,
        user_id: conversation.user_id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
      }}
    />
  );
}
