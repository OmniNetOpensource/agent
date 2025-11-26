import { type NextRequest, NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/shared/lib/supabase/config";
import { updateSession } from "@/shared/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 如果没有配置 Supabase，跳过 session 刷新
  if (!hasSupabaseConfig()) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // 排除静态资源和图片
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
