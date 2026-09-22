import Link from "next/link";
import { getAllPublishedArticles } from "@/lib/data";

export const revalidate = 60;

function isoDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
function monthKey(value: string) { return isoDate(value).slice(0, 7); }
function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, mon - 1, 1)));
}
function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  return new Date(Date.UTC(year, mon - 1 + delta, 1)).toISOString().slice(0, 7);
}
function buildCalendar(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: Array<number | null> = Array(offset).fill(null);
  for (let day = 1; day <= days; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; date?: string; month?: string }> }) {
  const { q = "", date = "", month } = await searchParams;
  const query = q.trim().toLowerCase();
  const articles = await getAllPublishedArticles();
  const newest = articles[0]?.publishedAt || new Date().toISOString();
  const selectedMonth = /^\d{4}-\d{2}$/.test(month || "") ? month! : monthKey(newest);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";

  const matching = articles.filter((article) => {
    const text = [article.title, article.excerpt, article.author, article.category, ...article.labels].join(" ").toLowerCase();
    return (!query || text.includes(query)) && (!selectedDate || isoDate(article.publishedAt) === selectedDate);
  });
  const datesWithNews = new Set(articles.filter((a) => monthKey(a.publishedAt) === selectedMonth).map((a) => isoDate(a.publishedAt)));
  const cells = buildCalendar(selectedMonth);
  const previousMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const archiveHref = (m: string) => "/search?month=" + m + (query ? "&q=" + encodeURIComponent(q) : "");

  return (
    <main className="container">
      <h1 className="pageTitle">Search &amp; News Archive</h1>
      <form className="search searchAdvanced" action="/search">
        <input name="q" defaultValue={q} placeholder="Search stories, topics, authors…" />
        <input type="date" name="date" defaultValue={selectedDate} aria-label="Search news by date" />
        <button>Search</button>
      </form>
      <section className="newsCalendar" aria-label="News archive calendar">
        <div className="calendarHeader"><Link href={archiveHref(previousMonth)} aria-label="Previous month">‹</Link><h2>{monthLabel(selectedMonth)}</h2><Link href={archiveHref(nextMonth)} aria-label="Next month">›</Link></div>
        <div className="calendarWeekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendarGrid">
          {cells.map((day, index) => {
            if (!day) return <span className="calendarDay empty" key={index} />;
            const dayDate = selectedMonth + "-" + String(day).padStart(2, "0");
            return datesWithNews.has(dayDate) ? (
              <Link className={selectedDate === dayDate ? "calendarDay active" : "calendarDay hasNews"} href={"/search?date=" + dayDate + "&month=" + selectedMonth} key={dayDate}><strong>{day}</strong><small>News</small></Link>
            ) : <span className="calendarDay" key={dayDate}>{day}</span>;
          })}
        </div>
        <p className="calendarHint">Dates marked <strong>News</strong> contain published Dweep Tulika stories.</p>
      </section>
      {(query || selectedDate) && <p className="meta archiveResultMeta">{matching.length} result(s){selectedDate ? " for " + new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(selectedDate + "T00:00:00Z")) : ""}{query ? " matching “" + q + "”" : ""}</p>}
      <div className="grid">
        {matching.map((article) => (
          <article className="card" key={article.id}>
            <div className="kicker">{article.category || "News"}</div>
            <div className="meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(article.publishedAt))}</div>
            <h2><Link href={article.url}>{article.title}</Link></h2>
            {article.excerpt && <p>{article.excerpt}</p>}
          </article>
        ))}
      </div>
      {!query && !selectedDate && <p className="archivePrompt">Use the calendar or search box above to find stories from the Dweep Tulika archive.</p>}
      {(query || selectedDate) && matching.length === 0 && <p className="archivePrompt">No published stories matched your search.</p>}
    </main>
  );
}
