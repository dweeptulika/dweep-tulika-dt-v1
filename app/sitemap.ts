import type { MetadataRoute } from "next";
import { getAllPublishedArticles } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

const categories = [
  "andaman-nicobar",
  "national",
  "politics",
  "editorial",
  "culture",
  "business",
  "sports",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllPublishedArticles();

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...categories.map((category) => ({
      url: `${SITE_URL}/category/${category}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...articles.map((article) => ({
      url: SITE_URL + article.url,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
