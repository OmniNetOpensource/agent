import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    let response = NextResponse.next({
      request,
    });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // 用 getUser 而非 getSession，因为 getUser 会实际向服务器验证 token
    await supabase.auth.getUser();

    return response;
  } catch (error) {
    console.error("[Supabase] Proxy failed", error);
    return NextResponse.next({
      request,
    });
  }
}
