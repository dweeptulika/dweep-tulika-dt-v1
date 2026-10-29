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
  article_type?: string | null;
  category_links?: Array<{ is_primary: boolean; category?: { name?: string; slug?: string } | null }> | null;
  source?: "blogger" | "newsroom";
  legacy_id?: string | null;
  legacy_url?: string | null;
  public_path?: string | null;
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

function newsroomUrl(article: Pick<DbArticle, "slug" | "published_at"> & { public_path?: string | null }) {
  if (article.public_path) return article.public_path;
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
  const linkedCategories = (article.category_links || []).map((link) => link.category?.name).filter((name): name is string => Boolean(name));
  const labels = linkedCategories.length ? [...new Set(linkedCategories)] : [canonicalCategory([article.category], article.title)];
  const primaryLink = (article.category_links || []).find((link) => link.is_primary)?.category?.name;
  const category = primaryLink || labels[0] || canonicalCategory([article.category], article.title);
  return {
    source: article.source === "blogger" ? "blogger" : "newsroom",
    id: `${article.source === "blogger" ? "blogger" : "newsroom"}-${article.id}`,
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
    labels,
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
  const withCategories = "id,title,slug,category,article_type,source,legacy_id,legacy_url,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,published_at,updated_at,category_links:article_categories(is_primary,category:categories(name,slug))";
  const legacyFields = "id,title,slug,category,source,legacy_id,legacy_url,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,published_at,updated_at";
  let result = await supabase.from("articles")
    .select(withCategories)
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (result.error) {
    // Preview deployments may run before the category migration is applied.
    result = await supabase.from("articles")
      .select(legacyFields)
      .in("status", ["published", "scheduled"])
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });
  }
  if (result.error || !result.data) return [];
  return (result.data as DbArticle[]).map(mapDbArticle);
}

export function normalizePublicPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed, "https://dweeptulika.in");
    return parsed.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return (trimmed.startsWith("/") ? trimmed : "/" + trimmed).replace(/\/+$/, "") || "/";
  }
}

export async function getAllPublishedArticles(): Promise<PublishedStory[]> {
  const newsroom = await getPublishedNewsroomArticles();
  const newsroomByPath = new Map<string, PublishedStory>();
  for (const article of newsroom) {
    const path = normalizePublicPath(article.url);
    if (!newsroomByPath.has(path)) newsroomByPath.set(path, article);
  }
  const adoptedPaths = new Set(newsroomByPath.keys());
  const blogger = liveArticles
    .map(mapLegacyArticle)
    .filter(article => !adoptedPaths.has(normalizePublicPath(article.url)));
  return [...newsroomByPath.values(), ...blogger]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function getPublishedNewsroomArticleByPath(year: string, month: string, slug: string): Promise<PublishedStory | null> {
  const normalizedSlug = slug.replace(/\.html$/, "");
  const requestedPath = `/${year}/${month}/${normalizedSlug}.html`;
  const supabase = publicSupabase();
  if (!supabase) return null;
  const selectFields = "id,title,slug,category,article_type,source,legacy_id,legacy_url,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,published_at,updated_at,category_links:article_categories(is_primary,category:categories(name,slug))";
  const { data: pathMatch } = await supabase
    .from("articles").select(selectFields)
    .eq("public_path", requestedPath)
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (pathMatch) return mapDbArticle(pathMatch as DbArticle);

  const { data, error } = await supabase
    .from("articles").select(selectFields)
    .eq("slug", normalizedSlug)
    .in("status", ["published", "scheduled"])
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  const article = mapDbArticle(data as DbArticle);
  if (normalizePublicPath(article.url) !== normalizePublicPath(requestedPath)) return null;
  return article;
}

export async function findArticleByPath(year: string, month: string, slug: string): Promise<PublishedStory | null> {
  const newsroom = await getPublishedNewsroomArticleByPath(year, month, slug);
  if (newsroom) return newsroom;
  const legacy = articleFromPath(year, month, slug);
  return legacy ? mapLegacyArticle(legacy) : null;
}

export async function allPublishedLabels(): Promise<string[]> {
  const stories = await getAllPublishedArticles();
  return [...new Set(stories.flatMap((story) => story.labels))].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function articleFromPath(year: string, month: string, slug: string) {
  // Next.js can pass percent-encoded path segments through to dynamic route params.
  // Decode safely so legacy Blogger filenames containing spaces still match their
  // original stored URL; retain the original value if it is malformed.
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    decodedSlug = slug;
  }
  const normalizedSlug = decodedSlug.replace(/\.html$/, "");
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
