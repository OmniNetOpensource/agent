import { NextResponse } from "next/server";

type SyncResponse = {
  success: boolean;
  syncedConversations: number;
  syncedMessages: number;
  errors?: string[];
};

export async function POST(req: Request) {
  void req;

  return NextResponse.json<SyncResponse>(
    {
      success: false,
      syncedConversations: 0,
      syncedMessages: 0,
      errors: ["Sync is disabled in local-only mode"],
    },
    { status: 501 }
  );
}
