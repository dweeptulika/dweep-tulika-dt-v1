"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdvertisementPanel } from "@/components/AdvertisementPanel";

const categories = ["Andaman News", "National", "Politics", "Editorial", "Culture", "Business", "Sports"];
type ArticleStatus = "draft" | "published" | "scheduled";
type ArticleRow = {
  id: string; title: string; slug: string; category: string; source?: "blogger" | "newsroom"; public_path?: string | null; author: string; excerpt: string;
  body_html: string; featured_image: string | null; seo_title: string | null;
  meta_description: string | null; social_image: string | null; status: ArticleStatus;
  scheduled_for: string | null; published_at: string | null; updated_at: string;
};

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sessionReady, setSessionReady] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [legacyArticles, setLegacyArticles] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([categories[0]]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(categories[0]); const [author, setAuthor] = useState("Dweep Tulika");
  const [excerpt, setExcerpt] = useState(""); const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState(""); const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState(""); const [socialImage, setSocialImage] = useState("");
  const [scheduledFor, setScheduledFor] = useState(""); const [publicationDate, setPublicationDate] = useState(""); const [status, setStatus] = useState<ArticleStatus>("draft");
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [legacyLoadError, setLegacyLoadError] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("All categories");
  const [libraryStatus, setLibraryStatus] = useState("All statuses");
  const [librarySource, setLibrarySource] = useState("All sources");
  const [libraryDate, setLibraryDate] = useState("");
  const [libraryPage, setLibraryPage] = useState(1);
  const libraryPageSize = 25;
  const sortedArticles = useMemo(() => [...articles].sort((a, b) => Date.parse(b.updated_at || b.published_at || "") - Date.parse(a.updated_at || a.published_at || "")), [articles]);
  const availableLegacyArticles = useMemo(() => legacyArticles.filter((legacy: any) => !articles.some(a => a.public_path === legacy.publicPath)).sort((a: any, b: any) => Date.parse(b.updatedAt || b.publishedAt || "") - Date.parse(a.updatedAt || a.publishedAt || "")), [legacyArticles, articles]);
  const filteredArticles = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    return sortedArticles.filter((article) => {
      const matchesQuery = !query || [article.title, article.slug, article.author, article.category, article.excerpt].join(" ").toLowerCase().includes(query);
      const matchesCategory = libraryCategory === "All categories" || article.category === libraryCategory;
      const matchesStatus = libraryStatus === "All statuses" || article.status === libraryStatus;
      const matchesSource = librarySource === "All sources" || (librarySource === "blogger" ? article.source === "blogger" : article.source !== "blogger");
      const matchesDate = !libraryDate || (article.published_at || article.updated_at || "").slice(0, 10) === libraryDate;
      return matchesQuery && matchesCategory && matchesStatus && matchesSource && matchesDate;
    });
  }, [sortedArticles, libraryQuery, libraryCategory, libraryStatus, librarySource, libraryDate]);
  const filteredLegacyArticles = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    if (libraryStatus !== "All statuses" && libraryStatus !== "published") return [];
    return availableLegacyArticles.filter((legacy: any) => {
      const matchesQuery = !query || [legacy.title, legacy.slug, legacy.author, legacy.category, legacy.excerpt, legacy.publicPath].join(" ").toLowerCase().includes(query);
      const matchesCategory = libraryCategory === "All categories" || legacy.category === libraryCategory;
      const matchesSource = librarySource === "All sources" || librarySource === "blogger";
      const matchesDate = !libraryDate || (legacy.publishedAt || legacy.updatedAt || "").slice(0, 10) === libraryDate;
      return matchesQuery && matchesCategory && matchesSource && matchesDate;
    });
  }, [availableLegacyArticles, libraryQuery, libraryCategory, libraryStatus, librarySource, libraryDate]);

  const pagedArticles = filteredArticles.slice((libraryPage - 1) * libraryPageSize, libraryPage * libraryPageSize);
  const libraryPageCount = Math.max(1, Math.ceil(filteredArticles.length / libraryPageSize));

  useEffect(() => {
    setLibraryPage(1);
  }, [libraryQuery, libraryCategory, libraryStatus, librarySource, libraryDate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/admin/login");
      else { setSessionReady(true); void loadArticles(); }
    });
  }, [router, supabase]);

  async function loadArticles() {
    const { data } = await supabase.from("articles")
      .select("id,title,slug,category,source,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at")
      .order("updated_at", { ascending: false });
    if (data) setArticles(data as ArticleRow[]);
    const legacyResponse = await fetch("/api/admin/legacy-articles", { cache: "no-store" });
    if (legacyResponse.ok) { setLegacyArticles(await legacyResponse.json()); setLegacyLoadError(false); }
    else { setLegacyArticles([]); setLegacyLoadError(true); }
  }

  function resetEditor() {
    setEditingId(null); setTitle(""); setSlug(""); setCategory(categories[0]); setSelectedCategories([categories[0]]); setAuthor("Dweep Tulika");
    setExcerpt(""); setBody(""); setFeaturedImage(""); setSeoTitle(""); setMetaDescription("");
    setSocialImage(""); setScheduledFor(""); setPublicationDate(""); setStatus("draft"); setOriginalPublishedAt(null); setMessage("");
  }

  async function editArticle(article: ArticleRow) {
    setEditingId(article.id); setTitle(article.title); setSlug(article.slug); setCategory(article.category); setSelectedCategories([article.category]);
    setAuthor(article.author); setExcerpt(article.excerpt); setBody(article.body_html); setFeaturedImage(article.featured_image || "");
    setSeoTitle(article.seo_title || ""); setMetaDescription(article.meta_description || "");
    setSocialImage(article.social_image || ""); setScheduledFor(toLocalDateTimeInput(article.scheduled_for));
    setPublicationDate(toLocalDateTimeInput(article.published_at));
    setOriginalPublishedAt(article.published_at);
    setStatus(article.scheduled_for && new Date(article.scheduled_for).getTime() > Date.now() ? "scheduled" : article.status);
    const { data: categoryRows } = await supabase.from("article_categories").select("categories(name),is_primary").eq("article_id", article.id);
    if (categoryRows?.length) setSelectedCategories(categoryRows.map((row: any) => row.categories?.name).filter(Boolean));
    setMessage("Editing saved newsroom article.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, kind: "featured" | "social") {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setMessage("Only JPEG, PNG and WebP images are allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage("Image is larger than the 10 MB newsroom limit."); return; }
    setUploading(true); setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeBase = makeSlug(file.name.replace(/\.[^.]+$/, "")) || "image";
    const path = "articles/" + Date.now() + "-" + safeBase + "." + extension;
    const { error: uploadError } = await supabase.storage.from("news-media").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (uploadError) { setMessage(uploadError.message); setUploading(false); return; }
    const { data: publicData } = supabase.storage.from("news-media").getPublicUrl(path);
    const { data: userData } = await supabase.auth.getUser();
    const { error: mediaError } = await supabase.from("media").insert({
      file_path: path, public_url: publicData.publicUrl,
      alt_text: title || safeBase.replace(/-/g, " "), caption: "", uploaded_by: userData.user?.id ?? null,
    });
    if (mediaError) setMessage("Image uploaded, but media record failed: " + mediaError.message);
    else {
      if (kind === "featured") setFeaturedImage(publicData.publicUrl); else setSocialImage(publicData.publicUrl);
      setMessage("Image uploaded successfully.");
    }
    setUploading(false); event.target.value = "";
  }

  async function syncArticleCategories(articleId: string, names: string[]) {
    const clean = [...new Set(names.length ? names : [category])];
    await supabase.from("article_categories").delete().eq("article_id", articleId);
    const { data: rows } = await supabase.from("categories").select("id,name").in("name", clean);
    if (rows?.length) await supabase.from("article_categories").insert(rows.map((row: any, index: number) => ({ article_id: articleId, category_id: row.id, is_primary: row.name === category || index === 0 })));
  }

  async function saveArticle(requestedStatus: ArticleStatus) {
    setBusy(true); setMessage("");
    const { data: userData } = await supabase.auth.getUser(); const user = userData.user;
    if (!user) { router.replace("/admin/login"); return; }
    const finalSlug = slug || makeSlug(title);
    if (!title.trim() || !finalSlug || !body.trim()) { setMessage("Headline, slug and article body are required."); setBusy(false); return; }
    if (requestedStatus === "scheduled" && !scheduledFor) { setMessage("Choose a date and time for scheduled publication."); setBusy(false); return; }
    const normalizedSlug = finalSlug.toLowerCase();
    const { data: slugMatch } = await supabase.from("articles").select("id").eq("slug", normalizedSlug).maybeSingle();
    if (slugMatch && slugMatch.id !== editingId) { setMessage("That URL slug is already in use. Choose a different slug."); setBusy(false); return; }

    const scheduledAt = requestedStatus === "scheduled" ? new Date(scheduledFor).toISOString() : null;
    const publishedAt = requestedStatus === "scheduled"
      ? scheduledAt
      : requestedStatus === "published"
        ? (publicationDate ? new Date(publicationDate).toISOString() : (originalPublishedAt || new Date().toISOString()))
        : originalPublishedAt;

    const payload = {
      title: title.trim(), slug: normalizedSlug, category, author: author.trim() || "Dweep Tulika", excerpt: excerpt.trim(),
      body_html: body, featured_image: featuredImage || null, seo_title: seoTitle.trim() || null,
      meta_description: metaDescription.trim() || excerpt.trim() || null, social_image: socialImage || null,
      status: requestedStatus === "scheduled" ? "published" : requestedStatus, scheduled_for: scheduledAt,
      published_at: publishedAt,
      updated_by: user.id,
    };
    const query = editingId
      ? supabase.from("articles").update(payload).eq("id", editingId)
      : supabase.from("articles").insert({ ...payload, created_by: user.id });
    const { error } = await query;
    if (error) setMessage(error.message);
    else {
      const { data: saved } = await supabase.from("articles").select("id").eq("slug", normalizedSlug).maybeSingle();
      if (saved?.id) await syncArticleCategories(saved.id, selectedCategories);
      setMessage(requestedStatus === "published" ? "Article published successfully." : requestedStatus === "scheduled" ? "Article scheduled successfully." : "Draft saved successfully."); resetEditor(); await loadArticles(); }
    setBusy(false);
  }

  async function adoptLegacyArticle(article: any) {
    setBusy(true); setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace("/admin/login"); return; }
    const { data: existing } = await supabase.from("articles").select("id").eq("public_path", article.publicPath).maybeSingle();
    if (existing) { setMessage("This Blogger article has already been adopted."); setBusy(false); return; }
    const { data: inserted, error } = await supabase.from("articles").insert({
      title: article.title, slug: article.slug, category: article.category, source: "blogger", legacy_id: article.id,
      legacy_url: article.publicPath, public_path: article.publicPath, author: article.author, excerpt: article.excerpt,
      body_html: article.bodyHtml, featured_image: article.featuredImage, seo_title: article.title, meta_description: article.excerpt || null,
      status: "published", published_at: new Date(article.publishedAt).toISOString(), updated_by: userData.user.id, created_by: userData.user.id
    }).select("id").single();
    if (error) { setMessage(error.message); setBusy(false); return; }
    if (inserted?.id) await syncArticleCategories(inserted.id, [article.category]);
    setEditingId(inserted.id);
    setTitle(article.title); setSlug(article.slug); setCategory(article.category); setSelectedCategories([article.category]);
    setAuthor(article.author); setExcerpt(article.excerpt); setBody(article.bodyHtml);
    setFeaturedImage(article.featuredImage || ""); setSeoTitle(article.title); setMetaDescription(article.excerpt || "");
    setSocialImage(""); setScheduledFor(""); setPublicationDate(toLocalDateTimeInput(article.publishedAt));
    setOriginalPublishedAt(new Date(article.publishedAt).toISOString()); setStatus("published");
    setMessage("Legacy Blogger article adopted. Its original public URL is preserved. The article is now open in the editor above.");
    await loadArticles();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setBusy(false);
  }

  async function submit(event: FormEvent) { event.preventDefault(); await saveArticle(editingId ? status : "draft"); }

  if (!sessionReady) return <main className="adminLogin"><p>Checking newsroom access…</p></main>;

  return (
    <main className="adminShell">
      <div className="adminTop">
        <div><div className="kicker">Dweep Tulika Newsroom</div><h1>Editorial Dashboard</h1><p>Authenticated publishing workspace for the digital edition.</p></div>
        <div className="adminHeaderActions"><Link className="adminBack" href="/">View Website</Link><Link className="adminBack" href="/admin/logout">Sign Out</Link></div>
      </div>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">{editingId ? "Edit Article" : "New Article"}</div><h2>{editingId ? "Update newsroom story" : "Write and publish"}</h2></div><span className="adminStatus">{status}</span></div>
        <form onSubmit={submit}>
          <label>Headline<input required value={title} onChange={e => { setTitle(e.target.value); if (!slug) setSlug(makeSlug(e.target.value)); }} placeholder="Enter the news headline" /></label>
          <label>Slug<input required value={slug} onChange={e => setSlug(makeSlug(e.target.value))} placeholder="article-url-slug" /></label>
          <div className="adminFormGrid">
            <fieldset className="adminCategoryField"><legend>Categories</legend><div className="adminCategoryChecks">{categories.map(item => <label key={item}><input type="checkbox" checked={selectedCategories.includes(item)} onChange={e => { const next = e.target.checked ? [...selectedCategories, item] : selectedCategories.filter(v => v !== item); const safe = next.length ? next : [item]; setSelectedCategories(safe); setCategory(safe[0]); }} /> {item}</label>)}</div></fieldset>
            <label>Author<input value={author} onChange={e => setAuthor(e.target.value)} /></label>
          </div>
          <label>Excerpt / summary<textarea rows={3} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short summary for cards and search engines" /></label>
          <div className="adminFormGrid">
            <label>SEO title<input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Optional search-result title" /></label>
            <label>Meta description<input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Optional meta description" /></label>
          </div>
          <div className="adminFormGrid">
            <label>Featured image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => uploadImage(e, "featured")} disabled={uploading || busy} /></label>
            <label>Social image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => uploadImage(e, "social")} disabled={uploading || busy} /></label>
          </div>
          {featuredImage && <div className="adminImagePreview"><img src={featuredImage} alt="Selected featured image" /><button type="button" onClick={() => setFeaturedImage("")}>Remove featured image</button></div>}
          {socialImage && <div className="adminImagePreview"><img src={socialImage} alt="Selected social image" /><button type="button" onClick={() => setSocialImage("")}>Remove social image</button></div>}
          <label>Article body
            <RichTextEditor value={body} onChange={setBody} />
          </label>
          <div className="adminFormGrid">
            <label>Publication date &amp; time<input type="datetime-local" value={publicationDate} onChange={e => setPublicationDate(e.target.value)} /><small>Use this to preserve or set the original publication date for backdated stories.</small></label>
            <label>Schedule date &amp; time<input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} /></label>
          </div>
          <div className="adminFormGrid">
            <label>Publishing status<select value={status} onChange={e => setStatus(e.target.value as ArticleStatus)}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select></label>
          </div>
          {message && <p className="adminMessage">{message}</p>}
          <div className="adminActions">
            <button type="submit" disabled={busy || uploading}>{busy ? "Saving…" : editingId ? "Save Changes" : "Save Draft"}</button>
            <button type="button" disabled={busy || uploading} onClick={() => void saveArticle(status === "draft" ? "published" : status)}>{busy ? "Working…" : status === "scheduled" ? "Schedule Article" : "Publish"}</button>
            {editingId && <button type="button" disabled={busy || uploading} onClick={resetEditor}>Cancel Edit</button>}
          </div>
          <p className="adminNote">Published URLs retain the newsroom date/slug format. Media is stored in the Dweep Tulika newsroom library.</p>
        </form>
      </section>

      <AdvertisementPanel />

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Newsroom Library</div><h2>Drafts &amp; published stories</h2></div></div>
        <div className="adminStoryList">
          <div className="adminFormGrid">
            <label>Search library<input value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Headline, slug, author or keyword" /></label>
            <label>Category<select value={libraryCategory} onChange={e => setLibraryCategory(e.target.value)}><option>All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="adminFormGrid">
            <label>Source<select value={librarySource} onChange={e => setLibrarySource(e.target.value)}><option>All sources</option><option value="newsroom">Newsroom</option><option value="blogger">Blogger</option></select></label>
            <label>Published/updated date<input type="date" value={libraryDate} onChange={e => setLibraryDate(e.target.value)} /></label>
          </div>
          <div className="adminFormGrid">
            <label>Status<select value={libraryStatus} onChange={e => setLibraryStatus(e.target.value)}><option>All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>
          </div>
          {pagedArticles.map(article => (
            <article className="adminStoryRow" key={article.id}>
              <div><span className="adminStatus">{article.status}</span><h3>{article.title}</h3><p>{article.category} · {article.published_at ? "Published " : "Updated "}{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(article.published_at || article.updated_at))}</p></div>
              <button type="button" onClick={() => editArticle(article)}>Edit</button>
            </article>
          ))}
          {filteredLegacyArticles.slice(0,100).map((legacy: any) => (
            <article className="adminStoryRow" key={"legacy-" + legacy.id}>
              <div><span className="adminStatus">blogger</span><h3>{legacy.title}</h3><p>{legacy.category} · {legacy.publicPath}</p></div>
              <button type="button" disabled={busy} onClick={() => void adoptLegacyArticle(legacy)}>Adopt &amp; Edit</button>
            </article>
          ))}
          {legacyLoadError && <p className="adminNote">Older Blogger stories could not be loaded. Refresh the page once to retry.</p>}
          {filteredArticles.length === 0 && filteredLegacyArticles.length === 0 && !legacyLoadError && <p className="adminNote">No stories match the current library filters.</p>}
          {filteredArticles.length > 0 && <div className="adminPagination">
            <button type="button" disabled={libraryPage <= 1} onClick={() => setLibraryPage(page => Math.max(1, page - 1))}>Previous</button>
            <span>Page {libraryPage} of {libraryPageCount} · {filteredArticles.length} newsroom stories</span>
            <button type="button" disabled={libraryPage >= libraryPageCount} onClick={() => setLibraryPage(page => Math.min(libraryPageCount, page + 1))}>Next</button>
          </div>}
          {(sortedArticles.length > 0 || availableLegacyArticles.length > 0) && <p className="adminNote">Sorted by last edited, newest first. Blogger stories are shown below the newsroom stories and can be adopted without changing their original public URL.</p>}
        </div>
      </section>
    </main>
  );
}
