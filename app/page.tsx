import Image from "next/image";
import Link from "next/link";
import { getAllPublishedArticles, type PublishedStory } from "@/lib/data";

function StoryImage({ article, large = false }: { article: PublishedStory; large?: boolean }) {
  if (!article.featuredImage) return null;
  return <div className={large ? "storyImage storyImageLarge" : "storyImage"}>
    <Image src={article.featuredImage} alt="" fill sizes={large ? "(max-width: 800px) 100vw, 820px" : "(max-width: 800px) 100vw, 400px"} priority={large} />
  </div>;
}

export default async function Home() {
  const items = await getAllPublishedArticles();
  const lead = items[0];
  return <div className="container">
    <section className="lead">
      {lead && <article className="hero">
        <StoryImage article={lead} large />
        <div className="kicker">{lead.labels[0] || "News"}</div>
        <h2><Link href={lead.url}>{lead.title}</Link></h2>
        <p>{lead.excerpt || "Read the latest report from Dweep Tulika."}</p>
        <small>{lead.author || "Dweep Tulika"} · {new Date(lead.publishedAt).toLocaleDateString("en-IN")}</small>
      </article>}
      <div className="side">{items.slice(1, 4).map(a => <article className="card" key={a.id}>
        <StoryImage article={a} />
        <div className="kicker">{a.labels[0] || "News"}</div>
        <h3><Link href={a.url}>{a.title}</Link></h3>
        <small>{new Date(a.publishedAt).toLocaleDateString("en-IN")}</small>
      </article>)}</div>
    </section>
    <section className="latest"><h2>Latest News</h2><div className="grid">{items.slice(0, 18).map(a => <article className="card" key={a.id}>
      <StoryImage article={a} />
      <div className="kicker">{a.labels[0] || "News"}</div>
      <h3><Link href={a.url}>{a.title}</Link></h3>
      <p>{a.excerpt}</p>
      <small>{new Date(a.publishedAt).toLocaleDateString("en-IN")}</small>
    </article>)}</div></section>
  </div>;
}
