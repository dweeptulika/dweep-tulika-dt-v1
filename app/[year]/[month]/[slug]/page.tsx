import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleJsonLd, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { findArticleByPath, getAllPublishedArticles, categoryPath } from "@/lib/data";

export const revalidate = 60;

export async function generateStaticParams() {
  const articles = await getAllPublishedArticles();
  return articles.map(a => {
    const m = a.url.match(/^\/(\d{4})\/(\d{2})\/(.+)\.html$/);
    return m ? { year: m[1], month: m[2], slug: m[3] } : null;
  }).filter(Boolean) as {year:string;month:string;slug:string}[];
}

export async function generateMetadata({ params }: { params: Promise<{year:string;month:string;slug:string}> }): Promise<Metadata> {
  const p=await params; const article=await findArticleByPath(p.year,p.month,p.slug);
  if(!article) return {};
  return { title: article.title, description: article.excerpt || undefined,
    alternates:{canonical:article.url},
    openGraph:{type:"article",title:article.title,description:article.excerpt||undefined,url:SITE_URL+article.url,publishedTime:article.publishedAt,modifiedTime:article.updatedAt,images:article.featuredImage?[article.featuredImage]:undefined}};
}

export default async function Article({params}:{params:Promise<{year:string;month:string;slug:string}>}) {
  const p=await params; const article=await findArticleByPath(p.year,p.month,p.slug);
  if(!article) notFound();
  const url=SITE_URL+article.url;
  return <div className="container"><div className="breadcrumbs"><Link href="/">Home</Link> / <Link href={"/category/"+categoryPath(article.category)}>{article.category}</Link></div>
    <article className="article"><div className="kicker">{article.labels.slice(0,4).join(" · ") || "News"}</div>
    <h1>{article.title}</h1>{article.excerpt && <p className="dek">{article.excerpt}</p>}
    <div className="meta">By {article.author || "Dweep Tulika"} · {new Date(article.publishedAt).toLocaleDateString("en-IN",{dateStyle:"long"})}</div>
    {article.featuredImage && <div className="articleFeaturedImage"><Image src={article.featuredImage} alt="" fill sizes="(max-width: 900px) 100vw, 900px" /> </div>}
    <div className="articlebody" dangerouslySetInnerHTML={{__html:article.bodyHtml}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleJsonLd(article as never,url))}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbJsonLd(article as never,url))}} />
    </article></div>;
}
