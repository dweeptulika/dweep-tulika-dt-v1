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

// Refresh public listing pages periodically instead of querying Supabase on every request.
export const revalidate = 300;

const descriptions: Record<string, string> = {
  "andaman-nicobar": "Local reporting on public services, governance, transport, health, education, the environment and community issues across the Andaman & Nicobar Islands.",
  national: "Coverage of national developments, public policy and decisions that shape India and may affect island communities.",
  politics: "Reporting on political parties, elected representatives, public accountability, governance and policy debates.",
  editorial: "Commentary, opinion and analysis examining public issues, policy choices and developments affecting society.",
  culture: "Stories on arts, literature, heritage, festivals, cultural organisations and the traditions of island communities.",
  business: "Coverage of business, trade, industry, employment, livelihoods and economic developments in the islands and beyond.",
  sports: "Reports on sporting events, athletes, competitions and community sports from the islands and across India.",
};

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
  const items = articles.filter((article) => article.category.toLowerCase() === label.toLowerCase());

  return (
    <main className="container">
      <div className="breadcrumbs"><Link href="/">Home</Link> / {label}</div>
      <h1 className="pageTitle">{label}</h1>
      <p className="dek categoryIntro">{descriptions[category] || `Latest ${label.toLowerCase()} reports and updates from Dweep Tulika.`}</p>
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
