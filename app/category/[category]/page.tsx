import Link from "next/link";
import { getAllPublishedArticles } from "@/lib/data";

const aliases: Record<string, string> = {
  "andaman-nicobar": "Andaman News",
  national: "National",
  politics: "Politics",
  culture: "Culture",
  business: "Business",
  sports: "Sports",
};

export const revalidate = 60;
export function generateStaticParams() { return Object.keys(aliases).map((category) => ({ category })); }

export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const label = aliases[category] || category.replaceAll("-", " ");
  const normalized = label.toLowerCase();
  const articles = await getAllPublishedArticles();
  const items = articles.filter((article) =>
    article.labels.some((x) => x.toLowerCase() === normalized) ||
    article.category.toLowerCase() === normalized
  );

  return (
    <main className="container">
      <div className="breadcrumbs"><Link href="/">Home</Link> / {label}</div>
      <h1 className="pageTitle">{label}</h1>
      <div className="grid">
        {items.map((article) => (
          <article className="card" key={article.id}>
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
