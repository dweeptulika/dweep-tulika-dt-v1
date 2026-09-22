import articles from "@/data/articles.json";
import pages from "@/data/pages.json";

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
