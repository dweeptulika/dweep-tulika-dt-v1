import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageFromSlug } from "@/lib/data";

const PAGE_SLUGS = [
  "terms-of-service",
  "publication-policies",
  "privacy-policy",
];

export function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug: `${slug}.html` }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = pageFromSlug(slug);
  if (!page) return {};
  return {
    title: page.title.trim(),
    description: `Dweep Tulika ${page.title.trim()}`,
    alternates: { canonical: page.filename },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pageFromSlug(slug);
  if (!page) notFound();

  return (
    <div className="container">
      <article className="article">
        <h1>{page.title.trim()}</h1>
        <div
          className="articlebody"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      </article>
    </div>
  );
}
