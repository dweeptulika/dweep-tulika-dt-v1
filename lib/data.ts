import articles from "@/data/articles.json";
import pages from "@/data/pages.json";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Article = typeof articles[number];
export type Page = typeof pages[number];

export const liveArticles = articles.filter((a) => a.status === "LIVE");

const CATEGORY_PATHS: Record<string, string> = {
  "andaman news": "andaman-nicobar",
  national: "national",
  politics: "politics",
  culture: "culture",
  business: "business",
  sports: "sports",
};

export type PublishedStory = {
  source: "blogger" | "newsroom";
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  excerpt: string;
  bodyHtml: string;
  featuredImage: string | null;
  publishedAt: string;
  updatedAt: string;
  url: string;
  labels: string[];
};

type DbArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  excerpt: string;
  body_html: string;
  featured_image: string | null;
  published_at: string;
  updated_at: string;
};

function publicSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

function newsroomUrl(article: Pick<DbArticle, "slug" | "published_at">) {
  const date = new Date(article.published_at);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `/${year}/${month}/${article.slug}.html`;
}

function mapDbArticle(article: DbArticle): PublishedStory {
  return {
    source: "newsroom",
    id: `newsroom-${article.id}`,
    title: article.title,
    slug: article.slug,
    category: article.category,
    author: article.author,
    excerpt: article.excerpt || "",
    bodyHtml: article.body_html || "",
    featuredImage: article.featured_image,
    publishedAt: article.published_at,
    updatedAt: article.updated_at,
    url: newsroomUrl(article),
    labels: [article.category],
  };
}

function mapLegacyArticle(article: Article): PublishedStory {
  return {
    source: "blogger",
    id: String(article.id),
    title: article.title,
    slug: articleSlug(article),
    category: article.labels.find(Boolean) || "News",
    author: article.author || "Dweep Tulika",
    excerpt: article.description || "",
    bodyHtml: article.html,
    featuredImage: articleImage(article),
    publishedAt: article.published,
    updatedAt: article.updated || article.published,
    url: article.filename,
    labels: article.labels.filter(Boolean),
  };
}

export async function getPublishedNewsroomArticles(): Promise<PublishedStory[]> {
  const supabase = publicSupabase();
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,slug,category,author,excerpt,body_html,featured_image,published_at,updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as DbArticle[]).map(mapDbArticle);
}

export async function getAllPublishedArticles(): Promise<PublishedStory[]> {
  const newsroom = await getPublishedNewsroomArticles();
  const blogger = liveArticles.map(mapLegacyArticle);
  return [...newsroom, ...blogger].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

export async function getPublishedNewsroomArticleByPath(
  year: string,
  month: string,
  slug: string,
): Promise<PublishedStory | null> {
  const normalizedSlug = slug.replace(/\.html$/, "");
  const supabase = publicSupabase();
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,slug,category,author,excerpt,body_html,featured_image,published_at,updated_at")
    .eq("slug", normalizedSlug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const article = mapDbArticle(data as DbArticle);
  if (article.url !== `/${year}/${month}/${normalizedSlug}.html`) return null;
  return article;
}

export async function findArticleByPath(
  year: string,
  month: string,
  slug: string,
): Promise<PublishedStory | null> {
  const legacy = articleFromPath(year, month, slug);
  if (legacy) return mapLegacyArticle(legacy);
  return getPublishedNewsroomArticleByPath(year, month, slug);
}

export async function allPublishedLabels(): Promise<string[]> {
  const stories = await getAllPublishedArticles();
  return [...new Set(stories.flatMap((story) => story.labels))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function articleFromPath(year: string, month: string, slug: string) {
  const normalizedSlug = slug.replace(/\.html$/, "");
  const filename = `/${year}/${month}/${normalizedSlug}.html`;
  return liveArticles.find((a) => a.filename === filename);
}

export function articleSlug(a: Article) {
  return a.filename
    .replace(/^\/[0-9]{4}\/[0-9]{2}\//, "")
    .replace(/\.html$/, "");
}

export function articleImage(a: Article) {
  const match = a.html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

export function categoryPath(label: string) {
  const normalized = label.trim().toLowerCase();
  return CATEGORY_PATHS[normalized] || normalized.replace(/\s+/g, "-");
}

export function pageFromSlug(slug: string) {
  const normalizedSlug = slug.replace(/\.html$/, "");
  return pages.find((p) => p.filename === `/p/${normalizedSlug}.html`);
}

export function allLabels() {
  return [...new Set(liveArticles.flatMap((a) => a.labels))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
