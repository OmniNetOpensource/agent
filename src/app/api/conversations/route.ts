import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import type { Conversation } from "@/types/conversation";

export async function GET(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ conversations: [] as Conversation[] });
  }

  const { searchParams } = new URL(request.url);
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Number.isNaN(parsedLimit) ? 10 : parsedLimit;

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
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Conversations] Failed to fetch", error.message);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversations: (data ?? []) as Conversation[] });
}
