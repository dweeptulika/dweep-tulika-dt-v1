import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/admin/login";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/admin/login";
  const failureUrl = new URL("/admin/login?error=recovery_link_invalid", requestUrl.origin);

  const supabase = await createClient();

  // Supabase can deliver recovery links as PKCE codes or token_hash links,
  // depending on the email template and the project's auth configuration.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(failureUrl);
    }
  } else if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return NextResponse.redirect(failureUrl);
    }
  } else {
    return NextResponse.redirect(failureUrl);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
