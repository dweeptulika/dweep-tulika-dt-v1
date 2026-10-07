import articles from "@/data/articles.json";
import pages from "@/data/pages.json";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type Article = typeof articles[number];
export type Page = typeof pages[number];

export const liveArticles = articles.filter((a) => a.status === "LIVE");

const CATEGORY_PATHS: Record<string, string> = {
  "andaman news": "andaman-nicobar",
  "andaman & nicobar": "andaman-nicobar",
  "andaman and nicobar": "andaman-nicobar",
  national: "national",
  politics: "politics",
  editorial: "editorial",
  culture: "culture",
  business: "business",
  sports: "sports",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  "Andaman News": ["andaman news", "andaman", "andaman & nicobar", "andaman and nicobar", "islands", "local news", "local"],
  National: ["national", "national news", "india", "indian news"],
  Politics: ["politics", "political", "political news"],
  Editorial: ["editorial", "opinion", "opinions", "edit", "column", "columns", "editorial news", "সম্পাদকীয়"],
  Culture: ["culture", "cultural", "arts", "art", "heritage", "culture & heritage", "cultural news"],
  Business: ["business", "business news", "economy", "economic", "commerce", "industry", "market", "markets"],
  Sports: ["sports", "sport", "sports news"],
};

const CANONICAL_CATEGORIES = Object.keys(CATEGORY_ALIASES);

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
  seoTitle?: string | null;
  metaDescription?: string | null;
  socialImage?: string | null;
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
  seo_title: string | null;
  meta_description: string | null;
  social_image: string | null;
};

function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function newsroomUrl(article: Pick<DbArticle, "slug" | "published_at">) {
  const date = new Date(article.published_at);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `/${year}/${month}/${article.slug}.html`;
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function canonicalCategory(labels: string[], title = "") {
  const normalizedLabels = labels.map(normalizeLabel);
  for (const category of CANONICAL_CATEGORIES) {
    if (normalizedLabels.some((label) => CATEGORY_ALIASES[category].includes(label))) return category;
  }
  const normalizedTitle = normalizeLabel(title);
  for (const category of CANONICAL_CATEGORIES) {
    if (CATEGORY_ALIASES[category].some((alias) => normalizedTitle.includes(alias))) return category;
  }
  return "Andaman News";
}

function mapDbArticle(article: DbArticle): PublishedStory {
  const category = canonicalCategory([article.category], article.title);
  return {
    source: "newsroom",
    id: `newsroom-${article.id}`,
    title: article.title,
    slug: article.slug,
    category,
    author: article.author,
    excerpt: article.excerpt || "",
    bodyHtml: article.body_html || "",
    featuredImage: article.featured_image,
    publishedAt: article.published_at,
    updatedAt: article.updated_at,
    url: newsroomUrl(article),
    labels: [category],
    seoTitle: article.seo_title,
    metaDescription: article.meta_description,
    socialImage: article.social_image,
  };
}

function mapLegacyArticle(article: Article): PublishedStory {
  const category = canonicalCategory(article.labels, article.title);
  return {
    source: "blogger",
    id: String(article.id),
    title: article.title,
    slug: articleSlug(article),
    category,
    author: article.author || "Dweep Tulika",
    excerpt: article.description || "",
    bodyHtml: article.html,
    featuredImage: articleImage(article),
    publishedAt: article.published,
    updatedAt: article.updated || article.published,
    url: article.filename,
    labels: [category, ...article.labels.filter((label) => normalizeLabel(label) !== normalizeLabel(category))],
  };
}


export type Advertisement = {
  id: string;
  name: string;
  advertiser: string;
  imageUrl: string;
  targetUrl: string | null;
  placement: "homepage" | "article" | "sidebar";
};

export async function getActiveAdvertisements(placement: Advertisement["placement"]): Promise<Advertisement[]> {
  const supabase = publicSupabase();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("advertisements")
    .select("id,name,advertiser,image_url,target_url,placement")
    .eq("placement", placement)
    .eq("active", true)
    .or("starts_at.is.null,starts_at.lte." + now)
    .or("ends_at.is.null,ends_at.gte." + now)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((ad) => ({ id: ad.id, name: ad.name, advertiser: ad.advertiser, imageUrl: ad.image_url, targetUrl: ad.target_url, placement: ad.placement }));
}
export async function getPublishedNewsroomArticles(): Promise<PublishedStory[]> {
  const supabase = publicSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,slug,category,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,published_at,updated_at")
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return (data as DbArticle[]).map(mapDbArticle);
}

export async function getAllPublishedArticles(): Promise<PublishedStory[]> {
  const newsroom = await getPublishedNewsroomArticles();
  const blogger = liveArticles.map(mapLegacyArticle);
  return [...newsroom, ...blogger].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function getPublishedNewsroomArticleByPath(year: string, month: string, slug: string): Promise<PublishedStory | null> {
  const normalizedSlug = slug.replace(/\.html$/, "");
  const supabase = publicSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,slug,category,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,published_at,updated_at")
    .eq("slug", normalizedSlug)
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  const article = mapDbArticle(data as DbArticle);
  if (article.url !== `/${year}/${month}/${normalizedSlug}.html`) return null;
  return article;
}

export async function findArticleByPath(year: string, month: string, slug: string): Promise<PublishedStory | null> {
  const legacy = articleFromPath(year, month, slug);
  if (legacy) return mapLegacyArticle(legacy);
  return getPublishedNewsroomArticleByPath(year, month, slug);
}

export async function allPublishedLabels(): Promise<string[]> {
  const stories = await getAllPublishedArticles();
  return [...new Set(stories.flatMap((story) => story.labels))].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function articleFromPath(year: string, month: string, slug: string) {
  const normalizedSlug = slug.replace(/\.html$/, "");
  const filename = `/${year}/${month}/${normalizedSlug}.html`;
  return liveArticles.find((a) => a.filename === filename);
}

export function articleSlug(a: Article) {
  return a.filename.replace(/^\/[0-9]{4}\/[0-9]{2}\//, "").replace(/\.html$/, "");
}

export function articleImage(a: Article) {
  const match = a.html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

export function categoryPath(label: string) {
  const normalized = normalizeLabel(label);
  return CATEGORY_PATHS[normalized] || normalized.replace(/\s+/g, "-");
}

export function pageFromSlug(slug: string) {
  const normalizedSlug = slug.replace(/\.html$/, "");
  return pages.find((p) => p.filename === `/p/${normalizedSlug}.html`);
}

export function allLabels() {
  return [...new Set(liveArticles.flatMap((a) => a.labels))].filter(Boolean).sort((a, b) => a.localeCompare(b));
}
