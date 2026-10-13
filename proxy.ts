import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createPublicSupabaseClient } from "@supabase/supabase-js";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  const pathname = request.nextUrl.pathname;

  // Public article URL redirects are resolved before the article page.
  // This intentionally returns HTTP 301, not Next.js permanentRedirect (308).
  const articlePathMatch = pathname.match(/^\/\d{4}\/\d{2}\/[^/]+\.html$/);
  if (articlePathMatch) {
    const redirectSupabase = createPublicSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { data: redirect } = await redirectSupabase
      .from("article_redirects")
      .select("new_path,status_code")
      .eq("old_path", pathname.replace(/\/+$/, ""))
      .maybeSingle();
    if (redirect?.status_code === 301 && redirect.new_path && redirect.new_path !== pathname) {
      const target = new URL(redirect.new_path, request.url);
      return NextResponse.redirect(target, 301);
    }
  }
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname === "/admin/logout";

  if (isAdmin && !isPublicAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("editorial_profiles")
      .select("id,role")
      .eq("id", user.sub)
      .maybeSingle();

    if (!profile || !["editor", "admin"].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/:year/:month/:slug.html"],
};
