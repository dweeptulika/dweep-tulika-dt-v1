import type { MetadataRoute } from "next";
import { getAllPublishedArticles } from "@/lib/data";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllPublishedArticles();
  return [
    { url: "https://www.dweeptulika.in/", priority: 1, changeFrequency: "daily" },
    { url: "https://www.dweeptulika.in/archive", priority: 0.9, changeFrequency: "daily" },
    { url: "https://www.dweeptulika.in/search", priority: 0.7, changeFrequency: "weekly" },
    { url: "https://www.dweeptulika.in/about", priority: 0.5, changeFrequency: "monthly" },
    { url: "https://www.dweeptulika.in/advertise", priority: 0.4, changeFrequency: "monthly" },
    ...articles.map((article) => ({
      url: "https://www.dweeptulika.in" + article.url,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...["terms-of-service", "publication-policies", "privacy-policy"].map((x) => ({
      url: "https://www.dweeptulika.in/p/" + x + ".html",
      priority: 0.2,
      changeFrequency: "yearly" as const,
    })),
  ];
}
