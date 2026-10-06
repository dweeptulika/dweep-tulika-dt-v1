import { categoryPath, type PublishedStory } from "@/lib/data";

export const SITE_URL = "https://www.dweeptulika.in";
export const SITE_NAME = "Dweep Tulika";
export const SITE_LOGO =
  "https://blogger.googleusercontent.com/img/a/AVvXsEhJ3O2ALVPRaVh4xa5sjb5cak1NEUvqzGOAVMb6_pKdZtiafHPuuXuO4IJU13NasgeXor5zyzIWviKh8bZ5yAS4A36CoJ24lxyF8EsIubyouuUyCQIa9eIif8ggVe8Xkua8sg6Tn-KafGLP6ZcB2GSOtA_uaHZcosg_WJXtm-FyJ2fVglkrqMTdqvnyqw=s676";

export function articleJsonLd(a: PublishedStory, url: string) {
  const image = a.socialImage || a.featuredImage || undefined;
  const authorName = a.author || "Dweep Tulika";
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.title,
    description: a.excerpt || undefined,
    ...(image ? { image: [image] } : {}),
    datePublished: a.publishedAt,
    dateModified: a.updatedAt || a.publishedAt,
    inLanguage: "en-IN",
    articleSection: a.category || undefined,
    author: [{ "@type": "Person", name: authorName }],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: SITE_LOGO },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": SITE_URL + "/#organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: SITE_LOGO },
      },
      {
        "@type": "WebSite",
        "@id": SITE_URL + "/#website",
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "en-IN",
        publisher: { "@id": SITE_URL + "/#organization" },
      },
    ],
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
