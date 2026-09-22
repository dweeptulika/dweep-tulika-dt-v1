import Link from "next/link";
import { getAllPublishedArticles } from "@/lib/data";

export const revalidate = 60;

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(value));
}

export default async function Archive() {
  const articles = await getAllPublishedArticles();
  const groups = new Map<string, typeof articles>();
  for (const article of articles) {
    const key = article.publishedAt.slice(0, 7);
    groups.set(key, [...(groups.get(key) || []), article]);
  }

  return (
    <main className="container">
      <h1 className="pageTitle">News Archive</h1>
      <p className="dek">Browse the published Dweep Tulika archive, including stories migrated from Blogger and new newsroom articles.</p>
      {Array.from(groups.entries()).map(([month, items]) => (
        <section key={month} className="archiveSection">
          <h2>{monthLabel(month + "-01T00:00:00Z")}</h2>
          <div className="grid">
            {items.map((article) => (
              <article className="card" key={article.id}>
                <div className="kicker">{article.category || "News"}</div>
                <div className="meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(article.publishedAt))}</div>
                <h3><Link href={article.url}>{article.title}</Link></h3>
                {article.excerpt && <p>{article.excerpt}</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
      {articles.length === 0 && <p className="archivePrompt">No published stories are available yet.</p>}
    </main>
  );
}
