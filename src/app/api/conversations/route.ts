import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { Conversation } from "@/types/conversation";

export async function POST(req: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const conversationTitle = body.title?.trim() || "新会话";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title: conversationTitle })
    .select("id, title")
    .single();

  if (error || !data) {
    console.error("[Conversations] Failed to create", error?.message);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, title: data.title ?? "新会话" });
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [] as Conversation[] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized", conversations: [] },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Conversations] Failed to fetch", error.message);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversations: (data ?? []) as Conversation[] });
}
