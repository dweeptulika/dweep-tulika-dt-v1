import { categoryPath, type PublishedStory } from "@/lib/data";

export const SITE_URL = "https://www.dweeptulika.in";
export const SITE_NAME = "Dweep Tulika";

export function articleJsonLd(a: PublishedStory, url: string) {
  const image = a.featuredImage || undefined;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.excerpt || undefined,
    ...(image ? { image: [image] } : {}),
    datePublished: a.publishedAt,
    dateModified: a.updatedAt || a.publishedAt,
    author: [{ "@type": "Person", name: a.author || "Dweep Tulika" }],
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
}

export function breadcrumbJsonLd(article: Pick<PublishedStory, "title" | "labels" | "category">, url: string) {
  const label = article.labels?.find(Boolean) || article.category || "News";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: label, item: SITE_URL + "/category/" + categoryPath(label) },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };
}
