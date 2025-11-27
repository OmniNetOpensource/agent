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
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    notFound();
  }

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, conversation_id, role, blocks, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgError) {
    notFound();
  }

  const normalizedMessages: Message[] = (messages ?? []).map((message) => ({
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
      conversation={conversation as Conversation}
    />
  );
}
