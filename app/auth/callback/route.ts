import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/admin/login";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/admin/login";

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=recovery_link_invalid", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=recovery_link_invalid", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
