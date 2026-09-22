import type { MetadataRoute } from "next";
import { liveArticles } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.dweeptulika.in/", priority: 1, changeFrequency: "daily" },
    { url: "https://www.dweeptulika.in/archive", priority: 0.9, changeFrequency: "daily" },
    { url: "https://www.dweeptulika.in/search", priority: 0.7, changeFrequency: "weekly" },
    { url: "https://www.dweeptulika.in/about", priority: 0.5, changeFrequency: "monthly" },
    ...liveArticles.map((a) => ({
      url: `https://www.dweeptulika.in${a.filename}`,
      lastModified: new Date(a.updated || a.published),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...["terms-of-service", "publication-policies", "privacy-policy"].map((x) => ({
      url: `https://www.dweeptulika.in/p/${x}.html`,
      priority: 0.2,
      changeFrequency: "yearly" as const,
    })),
  ];
}
