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

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, role, blocks, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Messages] Failed to fetch", error.message);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }

  const messages = (data ?? []).map((message) => ({
    ...message,
    blocks: Array.isArray(message.blocks) ? message.blocks : [],
  })) as DbMessage[];

  return NextResponse.json({ messages });
}
