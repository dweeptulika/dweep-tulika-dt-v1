import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { liveArticles, articleImage, articleSlug, canonicalCategory } from "@/lib/data";

function normalizePath(value: string) {
  try { return new URL(value, "https://dweeptulika.in").pathname.replace(/\/+$/, "") || "/"; }
  catch { return (value.startsWith("/") ? value : "/" + value).replace(/\/+$/, "") || "/"; }
}

async function authorizeEditor() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { supabase: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("editorial_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["editor", "admin"].includes(profile.role)) {
    return { supabase: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, response: null };
}

function toSummary(article: (typeof liveArticles)[number]) {
  return {
    id: String(article.id),
    title: article.title,
    slug: articleSlug(article),
    publicPath: article.filename,
    category: canonicalCategory(article.labels, article.title),
    author: article.author || "Dweep Tulika",
    excerpt: article.description || "",
    featuredImage: articleImage(article),
    publishedAt: article.published,
    updatedAt: article.updated || article.published,
    labels: article.labels,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeEditor();
  if (auth.response) return auth.response;

  const path = request.nextUrl.searchParams.get("path");
  if (path) {
    const normalizedPath = normalizePath(path);
    const article = liveArticles.find(item => normalizePath(item.filename) === normalizedPath);
    if (!article) return NextResponse.json({ error: "Legacy story not found" }, { status: 404 });
    return NextResponse.json({ ...toSummary(article), bodyHtml: article.html }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  // Listing responses contain metadata only. Full article HTML is fetched only
  // after an editor explicitly chooses to adopt a story.
  const stories = liveArticles
    .map(toSummary)
    .sort((a, b) => Date.parse(b.updatedAt || b.publishedAt) - Date.parse(a.updatedAt || a.publishedAt));

  return NextResponse.json(stories, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
