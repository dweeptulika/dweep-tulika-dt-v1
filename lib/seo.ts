export const SITE_URL = "https://www.dweeptulika.in";
export const SITE_NAME = "Dweep Tulika";

function firstArticleImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) return undefined;
  try {
    return new URL(match[1], SITE_URL).toString();
  } catch {
    return undefined;
  }
}

export function articleJsonLd(a: any, url: string) {
  const image = firstArticleImage(a.html || "");

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.description || undefined,
    ...(image ? { image: [image] } : {}),
    datePublished: a.published,
    dateModified: a.updated || a.published,
    author: [
      {
        "@type": "Person",
        name: a.author || "Dweep Tulika",
      },
    ],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
  };
}

export function breadcrumbJsonLd(
  article: { title: string; labels?: string[] },
  url: string,
) {
  const label = article.labels?.find(Boolean) || "News";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: label,
        item: SITE_URL + "/category/" + label.toLowerCase().replace(/\\s+/g, "-"),
      },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };
}
