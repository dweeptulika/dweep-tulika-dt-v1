import articles from "@/data/articles.json";
import pages from "@/data/pages.json";

export type Article = typeof articles[number];
export type Page = typeof pages[number];

export const liveArticles = articles.filter((a) => a.status === "LIVE");

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

export function pageFromSlug(slug: string) {
  const normalizedSlug = slug.replace(/\.html$/, "");
  return pages.find((p) => p.filename === `/p/${normalizedSlug}.html`);
}

export function allLabels() {
  return [...new Set(liveArticles.flatMap((a) => a.labels))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
