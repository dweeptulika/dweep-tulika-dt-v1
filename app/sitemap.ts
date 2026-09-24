import type { MetadataRoute } from "next";
import { getAllPublishedArticles } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllPublishedArticles();
  return [
    { url: SITE_URL + "/", priority: 1, changeFrequency: "daily" },
    { url: SITE_URL + "/archive", priority: 0.9, changeFrequency: "daily" },
    { url: SITE_URL + "/search", priority: 0.7, changeFrequency: "weekly" },
    { url: SITE_URL + "/about", priority: 0.5, changeFrequency: "monthly" },
    { url: SITE_URL + "/advertise", priority: 0.4, changeFrequency: "monthly" },
    ...articles.map((article) => ({
      url: SITE_URL + article.url,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...["terms-of-service", "publication-policies", "privacy-policy"].map((x) => ({
      url: SITE_URL + "/p/" + x + ".html",
      priority: 0.2,
      changeFrequency: "yearly" as const,
    })),
  ];
}
