import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { DbMessage } from "@/types/conversation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ messages: [] as DbMessage[] });
  }

  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select(
      "user_id, messages(id, conversation_id, role, blocks, created_at)"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true, foreignTable: "messages" })
    .maybeSingle();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const messages = (conversation.messages ?? []).map((message) => ({
    ...message,
    blocks: Array.isArray(message.blocks) ? message.blocks : [],
  })) as DbMessage[];

  return NextResponse.json({ messages });
}
