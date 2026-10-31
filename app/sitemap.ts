import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/seo";
import { getAllPublishedArticles } from "@/lib/data";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllPublishedArticles();
  const uniqueArticles = [...new Map(articles.map((article) => [canonicalSiteUrl(article.url), article])).values()];
  const staticPaths = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/archive", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/advertise", priority: 0.4, changeFrequency: "monthly" as const },
    ...["andaman-nicobar", "national", "politics", "editorial", "culture", "business", "sports"].map((category) => ({
      path: `/category/${category}`,
      priority: 0.7,
      changeFrequency: "daily" as const,
    })),
  ];
  return [
    ...staticPaths.map(({ path, priority, changeFrequency }) => ({
      url: canonicalSiteUrl(path),
      priority,
      changeFrequency,
    })),
    ...uniqueArticles.map((article) => ({
      url: canonicalSiteUrl(article.url),
      lastModified: new Date(article.updatedAt || article.publishedAt),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...["terms-of-service", "publication-policies", "privacy-policy"].map((slug) => ({
      url: canonicalSiteUrl(`/p/${slug}.html`),
      priority: 0.2,
      changeFrequency: "yearly" as const,
    })),
  ];
}
