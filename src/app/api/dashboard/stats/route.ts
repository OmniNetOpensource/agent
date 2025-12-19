import { NextResponse } from "next/server";
import type { DashboardStatsResponse } from "@/src/features/dashboard/types";

export async function GET() {
  const payload: DashboardStatsResponse = {
    userMessageCount: 0,
    conversationCount: 0,
    isLocalOnly: true,
  };

  return NextResponse.json(payload);
}
