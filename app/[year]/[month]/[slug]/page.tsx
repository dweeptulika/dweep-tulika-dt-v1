import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleFromPath, liveArticles } from "@/lib/data";
import { articleJsonLd, SITE_URL } from "@/lib/seo";

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
      modifiedTime: article.updated,
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

  return (
    <div className="container">
      <div className="breadcrumbs">
        <a href="/">Home</a> / {article.labels[0] || "News"}
      </div>
      <article className="article">
        <div className="kicker">
          {article.labels.slice(0, 4).join(" · ") || "News"}
        </div>
        <h1>{article.title}</h1>
        <p className="dek">{article.description}</p>
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
      </article>
    </div>
  );
}
