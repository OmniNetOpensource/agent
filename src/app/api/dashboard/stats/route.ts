import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { DashboardStatsResponse } from "@/src/features/dashboard/types";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured", userMessageCount: 0 },
      { status: 500 }
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

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id);

  if (conversationsError) {
    console.error(
      "[Dashboard] Failed to fetch conversations:",
      conversationsError.message
    );
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }

  const conversationIds =
    conversations?.map((conversation) => conversation.id).filter(Boolean) ?? [];

  if (conversationIds.length === 0) {
    const payload: DashboardStatsResponse = {
      userMessageCount: 0,
    };
    return NextResponse.json(payload);
  }

  const { count, error: countError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .in("conversation_id", conversationIds);

  if (countError) {
    console.error(
      "[Dashboard] Failed to count user messages:",
      countError.message
    );
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }

  const payload: DashboardStatsResponse = {
    userMessageCount: count ?? 0,
  };

  return NextResponse.json(payload);
}
