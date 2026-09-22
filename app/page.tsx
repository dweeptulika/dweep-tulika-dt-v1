import Link from "next/link";
import { articleImage, liveArticles } from "@/lib/data";

function StoryImage({ article, large = false }: { article: (typeof liveArticles)[number]; large?: boolean }) {
  const src = articleImage(article);
  if (!src) return null;
  return (
    <img
      className={large ? "storyImage storyImageLarge" : "storyImage"}
      src={src}
      alt=""
      loading={large ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export default function Home() {
  const items = [...liveArticles].sort(
    (a, b) => Date.parse(b.published) - Date.parse(a.published),
  );
  const lead = items[0];

  return (
    <div className="container">
      <section className="lead">
        {lead && (
          <article className="hero">
            <StoryImage article={lead} large />
            <div className="kicker">{lead.labels[0] || "News"}</div>
            <h2>
              <Link href={lead.filename}>{lead.title}</Link>
            </h2>
            <p>{lead.description || "Read the latest report from Dweep Tulika."}</p>
            <small>
              {lead.author || "Dweep Tulika"} ·{" "}
              {new Date(lead.published).toLocaleDateString("en-IN")}
            </small>
          </article>
        )}

        <div className="side">
          {items.slice(1, 4).map((a) => (
            <article className="card" key={a.id}>
              <StoryImage article={a} />
              <div className="kicker">{a.labels[0] || "News"}</div>
              <h3>
                <Link href={a.filename}>{a.title}</Link>
              </h3>
              <small>{new Date(a.published).toLocaleDateString("en-IN")}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="latest">
        <h2>Latest News</h2>
        <div className="grid">
          {items.slice(0, 18).map((a) => (
            <article className="card" key={a.id}>
              <StoryImage article={a} />
              <div className="kicker">{a.labels[0] || "News"}</div>
              <h3>
                <Link href={a.filename}>{a.title}</Link>
              </h3>
              <p>{a.description}</p>
              <small>{new Date(a.published).toLocaleDateString("en-IN")}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
