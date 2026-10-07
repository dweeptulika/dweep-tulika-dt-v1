import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { liveArticles, articleImage, articleSlug, canonicalCategory } from "@/lib/data";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("editorial_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["editor", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Keep the admin list response small. Full article HTML is still included
  // because the existing Adopt & Edit flow needs it immediately.
  const stories = liveArticles
    .map((article) => ({
      id: String(article.id),
      title: article.title,
      slug: articleSlug(article),
      publicPath: article.filename,
      category: canonicalCategory(article.labels, article.title),
      author: article.author || "Dweep Tulika",
      excerpt: article.description || "",
      bodyHtml: article.html,
      featuredImage: articleImage(article),
      publishedAt: article.published,
      updatedAt: article.updated || article.published,
      labels: article.labels,
    }))
    .sort((a, b) => Date.parse(b.updatedAt || b.publishedAt) - Date.parse(a.updatedAt || a.publishedAt))
    .slice(0, 100);

  return NextResponse.json(stories, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
