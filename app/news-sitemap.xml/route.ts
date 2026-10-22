import { getAllPublishedArticles } from "@/lib/data";

export const revalidate = 300;

const SITE_URL = "https://dweeptulika.in";
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const now = Date.now();
  const cutoff = now - NEWS_WINDOW_MS;
  const articles = await getAllPublishedArticles();

  const recentArticles = articles
    .filter((article) => {
      const publishedAt = Date.parse(article.publishedAt);
      return Number.isFinite(publishedAt) && publishedAt <= now && publishedAt >= cutoff;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 1000);

  const entries = recentArticles
    .map((article) => {
      const url = new URL(article.url, SITE_URL).toString();
      const publishedAt = new Date(article.publishedAt).toISOString();
      return [
        "  <url>",
        `    <loc>${escapeXml(url)}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        "        <news:name>Dweep Tulika</news:name>",
        "        <news:language>en</news:language>",
        "      </news:publication>",
        `      <news:publication_date>${publishedAt}</news:publication_date>`,
        `      <news:title>${escapeXml(article.title)}</news:title>`,
        "    </news:news>",
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
