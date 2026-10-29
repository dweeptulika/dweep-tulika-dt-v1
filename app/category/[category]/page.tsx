import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL } from "@/lib/seo";
import { getAllPublishedArticles } from "@/lib/data";

const aliases: Record<string, string> = {
  "andaman-nicobar": "Andaman News",
  national: "National",
  politics: "Politics",
  editorial: "Editorial",
  culture: "Culture",
  business: "Business",
  sports: "Sports",
};

export const revalidate = 0;

function ArticleImage({ src, title }: { src: string | null; title: string }) {
  if (!src) return null;
  return <div className="storyImage"><Image src={src} alt={title} fill sizes="(max-width: 800px) 100vw, 400px" /></div>;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = aliases[category] || category.replaceAll("-", " ");
  const categoryTitle = label === "Andaman News" ? "Andaman & Nicobar" : label;
  const title = `${categoryTitle} News`;
  const subject = label === "Andaman News" ? "Andaman & Nicobar" : label;
  const description = `Latest ${subject.toLowerCase()} news, reports and updates from Dweep Tulika, covering the islands and beyond.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${category}` },
    openGraph: { type: "website", title, description, url: `${SITE_URL}/category/${category}`, siteName: "Dweep Tulika" },
  };
}
export function generateStaticParams() { return Object.keys(aliases).map((category) => ({ category })); }

export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const label = aliases[category] || category.replaceAll("-", " ");
  const articles = await getAllPublishedArticles();
  const items = articles.filter((article) => article.labels.some((articleLabel) => articleLabel.toLowerCase() === label.toLowerCase()));

  return (
    <main className="container">
      <div className="breadcrumbs"><Link href="/">Home</Link> / {label}</div>
      <h1 className="pageTitle">{label}</h1>
      <div className="grid">
        {items.map((article) => (
          <article className="card" key={article.id}>
            <ArticleImage src={article.featuredImage} title={article.title} />
            <div className="kicker">{article.category || "News"}</div>
            <div className="meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(article.publishedAt))}</div>
            <h2><Link href={article.url}>{article.title}</Link></h2>
            {article.excerpt && <p>{article.excerpt}</p>}
          </article>
        ))}
      </div>
      {items.length === 0 && <p className="archivePrompt">No published stories found in this category.</p>}
    </main>
  );
}
