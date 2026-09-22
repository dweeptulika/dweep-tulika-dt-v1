import Link from "next/link";
import { liveArticles } from "@/lib/data";

function isoDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function monthKey(value: string) {
  return isoDate(value).slice(0, 7);
}

function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, mon - 1, 1)),
  );
}

function shiftMonth(month: string, delta: number) {
  const [year, mon] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function buildCalendar(month: string) {
  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cells: Array<number | null> = Array(mondayOffset).fill(null);
  for (let day = 1; day <= days; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string; month?: string }>;
}) {
  const { q = "", date = "", month } = await searchParams;
  const query = q.trim().toLowerCase();

  const newest = liveArticles[0]?.published || new Date().toISOString();
  const selectedMonth = /^\d{4}-\d{2}$/.test(month || "") ? month! : monthKey(newest);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";

  const matching = liveArticles.filter((a) => {
    const text = `${a.title} ${a.description} ${a.author} ${a.labels.join(" ")}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesDate = !selectedDate || isoDate(a.published) === selectedDate;
    return matchesQuery && matchesDate;
  });

  const datesWithNews = new Set(
    liveArticles.filter((a) => monthKey(a.published) === selectedMonth).map((a) => isoDate(a.published)),
  );

  const cells = buildCalendar(selectedMonth);
  const previousMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);

  const archiveHref = (m: string) =>
    `/search?month=${m}${query ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="container">
      <h1 className="pageTitle">Search &amp; News Archive</h1>

      <form className="search searchAdvanced" action="/search">
        <input name="q" defaultValue={q} placeholder="Search stories, topics, authors…" />
        <input
          type="date"
          name="date"
          defaultValue={selectedDate}
          aria-label="Search news by date"
        />
        <button>Search</button>
      </form>

      <section className="newsCalendar" aria-label="News archive calendar">
        <div className="calendarHeader">
          <Link href={archiveHref(previousMonth)} aria-label="Previous month">‹</Link>
          <h2>{monthLabel(selectedMonth)}</h2>
          <Link href={archiveHref(nextMonth)} aria-label="Next month">›</Link>
        </div>
        <div className="calendarWeekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendarGrid">
          {cells.map((day, index) => {
            if (!day) return <span className="calendarDay empty" key={index} />;
            const dayDate = `${selectedMonth}-${String(day).padStart(2, "0")}`;
            const hasNews = datesWithNews.has(dayDate);
            return hasNews ? (
              <Link
                className={selectedDate === dayDate ? "calendarDay active" : "calendarDay hasNews"}
                href={`/search?date=${dayDate}&month=${selectedMonth}`}
                key={dayDate}
              >
                <strong>{day}</strong>
                <small>News</small>
              </Link>
            ) : (
              <span className="calendarDay" key={dayDate}>
                {day}
              </span>
            );
          })}
        </div>
        <p className="calendarHint">
          Dates marked <strong>News</strong> contain published Dweep Tulika stories. Select a date to view them.
        </p>
      </section>

      {(query || selectedDate) && (
        <p className="meta archiveResultMeta">
          {matching.length} result(s)
          {selectedDate ? ` for ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date(`${selectedDate}T00:00:00Z`))}` : ""}
          {query ? ` matching “${q}”` : ""}
        </p>
      )}

      <div className="grid">
        {matching.map((a) => (
          <article className="card" key={a.id}>
            <div className="kicker">{a.labels[0] || "News"}</div>
            <div className="meta">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(a.published))}</div>
            <h2><Link href={a.filename}>{a.title}</Link></h2>
            <p>{a.description}</p>
          </article>
        ))}
      </div>

      {!query && !selectedDate && (
        <p className="archivePrompt">Use the calendar or search box above to find stories from the Dweep Tulika archive.</p>
      )}

      {(query || selectedDate) && matching.length === 0 && (
        <p className="archivePrompt">No published stories matched your search.</p>
      )}
    </div>
  );
}
