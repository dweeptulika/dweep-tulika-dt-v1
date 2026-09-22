import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleFromPath, articleImage, categoryPath, liveArticles } from "@/lib/data";
import { articleJsonLd, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return liveArticles
    .map((a) => {
      const match = a.filename.match(/^\/(\d{4})\/(\d{2})\/(.+)\.html$/);
      return match
        ? { year: match[1], month: match[2], slug: `${match[3]}.html` }
        : null;
    })
    .filter(Boolean) as { year: string; month: string; slug: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string; slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const article = articleFromPath(p.year, p.month, p.slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.description || undefined,
    alternates: { canonical: article.filename },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description || undefined,
      url: `${SITE_URL}${article.filename}`,
      publishedTime: article.published,
      modifiedTime: article.updated || article.published,\n      images: articleImage(article) ? [articleImage(article)!] : undefined,
    },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<{ year: string; month: string; slug: string }>;
}) {
  const p = await params;
  const article = articleFromPath(p.year, p.month, p.slug);
  if (!article) notFound();

  const url = SITE_URL + article.filename;
  const label = article.labels.find(Boolean) || "News";
  const categorySlug = categoryPath(label);

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href="/">Home</Link> /{" "}
        <Link href={`/category/${categorySlug}`}>{label}</Link>
      </div>
      <article className="article">
        <div className="kicker">
          {article.labels.filter(Boolean).slice(0, 4).join(" · ") || "News"}
        </div>
        <h1>{article.title}</h1>
        {article.description && <p className="dek">{article.description}</p>}
        <div className="meta">
          By {article.author || "Dweep Tulika"} ·{" "}
          {new Date(article.published).toLocaleDateString("en-IN", {
            dateStyle: "long",
          })}
        </div>
        <div
          className="articlebody"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd(article, url)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd(article, url)),
          }}
        />
      </article>
    </div>
  );
}
