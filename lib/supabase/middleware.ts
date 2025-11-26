import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();

    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...(options ?? {}),
          });
        },
        remove(name: string, options?: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...(options ?? {}),
            maxAge: 0,
          });
        },
      },
    });

    await supabase.auth.getSession();

    return response;
  } catch (error) {
    console.error("[Supabase] Middleware failed", error);
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
}
