import { NextResponse, type NextRequest } from "next/server";

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
  const failureUrl = new URL(
    "/admin/login?error=recovery_link_invalid",
    requestUrl.origin,
  );

  // Complete the exchange in the browser. Supabase PKCE stores its verifier
  // in the browser's cookie storage; exchanging here on the server can fail
  // when that verifier is not present in the request cookies.
  if (code || (tokenHash && type === "recovery")) {
    const completionUrl = new URL("/auth/complete", requestUrl.origin);
    if (code) completionUrl.searchParams.set("code", code);
    if (tokenHash) completionUrl.searchParams.set("token_hash", tokenHash);
    if (type) completionUrl.searchParams.set("type", type);
    completionUrl.searchParams.set("next", next);
    return NextResponse.redirect(completionUrl);
  }

  return NextResponse.redirect(failureUrl);
}
