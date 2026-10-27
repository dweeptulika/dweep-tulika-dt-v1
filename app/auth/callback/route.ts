import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/admin/login";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/admin/login";

  const failureUrl = new URL("/admin/login?error=recovery_link_invalid", requestUrl.origin);

  if (!code && !(tokenHash && type === "recovery")) {
    return NextResponse.redirect(failureUrl);
  }

  // The dedicated recovery client stores the PKCE verifier in browser localStorage.
  // Forward the one-time code to the browser completion page so it can exchange
  // the code in the same browser context that created the verifier.
  const completionUrl = new URL("/auth/complete", requestUrl.origin);
  if (code) completionUrl.searchParams.set("code", code);
  if (tokenHash) completionUrl.searchParams.set("token_hash", tokenHash);
  if (type) completionUrl.searchParams.set("type", type);
  completionUrl.searchParams.set("next", next);

  const response = NextResponse.redirect(completionUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
