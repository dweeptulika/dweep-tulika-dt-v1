import Link from "next/link";
import { liveArticles, allLabels, categoryPath } from "@/lib/data";

const PAGE_SIZE = 20;

function dateValue(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export default async function Archive({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; year?: string; month?: string; category?: string }>;
}) {
  const params = await searchParams;
  const year = /^\d{4}$/.test(params.year || "") ? params.year! : "";
  const month = /^\d{4}-\d{2}$/.test(params.month || "") ? params.month! : "";
  const category = (params.category || "").trim();

  const months = [...new Set(
    liveArticles.map((a) => {
      const d = new Date(a.published);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 7);
    }).filter(Boolean),
  )].sort().reverse();

  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const categories = allLabels();

  const filtered = [...liveArticles]
    .sort((a, b) => dateValue(b.published) - dateValue(a.published))
    .filter((a) => {
      const d = new Date(a.published);
      if (Number.isNaN(d.getTime())) return false;
      const ym = d.toISOString().slice(0, 7);
      return (!year || ym.startsWith(year)) &&
        (!month || ym === month) &&
        (!category || a.labels.includes(category));
    });

  const requestedPage = Math.max(1, Number(params.page || "1") || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function href(nextPage: number) {
    const q = new URLSearchParams();
    if (year) q.set("year", year);
    if (month) q.set("month", month);
    if (category) q.set("category", category);
    if (nextPage > 1) q.set("page", String(nextPage));
    const value = q.toString();
    return value ? `/archive?${value}` : "/archive";
  }

  return (
    <div className="container archivePage">
      <div className="kicker">Dweep Tulika Archives</div>
      <h1 className="pageTitle">All News</h1>
      <p className="archiveLead">
        Browse the complete published Dweep Tulika archive by year, month and category.
        The archive preserves the original publication dates and links to the original article URLs.
      </p>

      <form className="archiveFilters" action="/archive">
        <label>Year
          <select name="year" defaultValue={year}>
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label>Month
          <select name="month" defaultValue={month}>
            <option value="">All months</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <label>Category
          <select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <button type="submit">Filter Archive</button>
        <Link className="filterReset" href="/archive">Reset</Link>
      </form>

      <div className="archiveTools">
        <Link href="/search">Search the archive by keyword or calendar date →</Link>
        <strong>{filtered.length} published stories</strong>
      </div>

      <div className="archiveList">
        {items.map((a) => (
          <article className="archiveItem" key={a.id}>
            <div className="archiveDate">
              {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(a.published))}
            </div>
            <div>
              <div className="kicker">{a.labels[0] || "News"}</div>
              <h2><Link href={a.filename}>{a.title}</Link></h2>
              <p>{a.description}</p>
              <small>{a.author || "Dweep Tulika"}</small>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 && <p className="archivePrompt">No published stories match these filters.</p>}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Archive pagination">
          {page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : <span>← Previous</span>}
          <strong>Page {page} of {totalPages}</strong>
          {page < totalPages ? <Link href={href(page + 1)}>Next →</Link> : <span>Next →</span>}
        </nav>
      )}
    </div>
  );
}
