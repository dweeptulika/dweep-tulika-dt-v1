"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdvertisementPanel } from "@/components/AdvertisementPanel";
import { sanitizeArticleHtml } from "@/lib/security";

const categories = ["Andaman News", "National", "Politics", "Editorial", "Culture", "Business", "Sports"];
type ArticleStatus = "draft" | "published" | "scheduled";

type LegacyArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  excerpt: string;
  publicPath: string;
  bodyHtml: string;
  featuredImage: string | null;
  publishedAt: string;
  updatedAt: string;
  labels?: string[];
};

type ArticleCategoryLink = {
  categories: { name: string }[] | null;
  is_primary: boolean;
};

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
  const [legacyArticles, setLegacyArticles] = useState<LegacyArticle[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([categories[0]]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const [categoryRows, setCategoryRows] = useState<{ id: string; name: string; description: string | null }[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const libraryPageSize = 25;
  const todayIndia = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const publishedTodayCount = articles.filter(article => article.status === "published" && (article.published_at || "").slice(0, 10) === todayIndia).length;
  const draftCount = articles.filter(article => article.status === "draft").length;
  const scheduledCount = articles.filter(article => article.status === "scheduled").length;
  const publishedTotalCount = articles.filter(article => article.status === "published").length;
  const recentEditedArticles = [...articles].sort((a, b) => Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "")).slice(0, 5);
  const categoryNames = categoryRows.length ? categoryRows.map(row => row.name) : categories;
  const sortedArticles = useMemo(() => [...articles].sort((a, b) => Date.parse(b.updated_at || b.published_at || "") - Date.parse(a.updated_at || a.published_at || "")), [articles]);
  const availableLegacyArticles = useMemo(() => legacyArticles.filter((legacy: LegacyArticle) => !articles.some(a => a.public_path === legacy.publicPath)).sort((a: LegacyArticle, b: LegacyArticle) => Date.parse(b.updatedAt || b.publishedAt || "") - Date.parse(a.updatedAt || a.publishedAt || "")), [legacyArticles, articles]);
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
    return availableLegacyArticles.filter((legacy: LegacyArticle) => {
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
    const { data: categoryData } = await supabase.from("categories").select("id,name,description").order("name");
    if (categoryData) setCategoryRows(categoryData);
    const legacyResponse = await fetch("/api/admin/legacy-articles", { cache: "no-store" });
    if (legacyResponse.ok) { setLegacyArticles(await legacyResponse.json()); setLegacyLoadError(false); }
    else { setLegacyArticles([]); setLegacyLoadError(true); }
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setCategoryBusy(true);
    const { data, error } = await supabase.from("categories").insert({ name, slug: makeSlug(name) }).select("id,name,description").single();
    if (error) setMessage(error.message.includes("duplicate") ? "That category already exists." : error.message);
    else if (data) { setCategoryRows(rows => [...rows, data].sort((a, b) => a.name.localeCompare(b.name))); setNewCategory(""); setMessage("Category added."); }
    setCategoryBusy(false);
  }

  async function deleteCategory(id: string) {
    if (categoryRows.length <= 1) return;
    setCategoryBusy(true);
    const { count } = await supabase.from("article_categories").select("article_id", { count: "exact", head: true }).eq("category_id", id);
    if ((count || 0) > 0) {
      setMessage("This category is in use and cannot be deleted.");
    } else {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) setMessage(error.message);
      else { setCategoryRows(rows => rows.filter(row => row.id !== id)); setMessage("Category deleted."); }
    }
    setCategoryBusy(false);
  }

  function resetEditor() {
    setPreviewOpen(false);
    setEditingId(null); setTitle(""); setSlug(""); setCategory(categories[0]); setSelectedCategories([categories[0]]); setAuthor("Dweep Tulika");
    setExcerpt(""); setBody(""); setFeaturedImage(""); setSeoTitle(""); setMetaDescription("");
    setSocialImage(""); setScheduledFor(""); setPublicationDate(""); setStatus("draft"); setOriginalPublishedAt(null); setMessage("");
  }

  async function editArticle(article: ArticleRow) {
    setPreviewOpen(false);
    setEditingId(article.id); setTitle(article.title); setSlug(article.slug); setCategory(article.category); setSelectedCategories([article.category]);
    setAuthor(article.author); setExcerpt(article.excerpt); setBody(article.body_html); setFeaturedImage(article.featured_image || "");
    setSeoTitle(article.seo_title || ""); setMetaDescription(article.meta_description || "");
    setSocialImage(article.social_image || ""); setScheduledFor(toLocalDateTimeInput(article.scheduled_for));
    setPublicationDate(toLocalDateTimeInput(article.published_at));
    setOriginalPublishedAt(article.published_at);
    setStatus(article.scheduled_for && new Date(article.scheduled_for).getTime() > Date.now() ? "scheduled" : article.status);
    const { data: categoryRows } = await supabase.from("article_categories").select("categories(name),is_primary").eq("article_id", article.id);
    if (categoryRows?.length) {
      const linkedCategories = categoryRows as unknown as ArticleCategoryLink[];
      setSelectedCategories(linkedCategories.map((row) => row.categories?.[0]?.name).filter((name): name is string => Boolean(name)));
    }
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

  async function uploadInlineImage(file: File): Promise<{ url: string; alt: string } | null> {
    setUploading(true);
    setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeBase = makeSlug(file.name.replace(/\.[^.]+$/, "")) || "inline-image";
      const path = "articles/inline-" + Date.now() + "-" + safeBase + "." + extension;
      const { error: uploadError } = await supabase.storage.from("news-media").upload(path, file, { cacheControl: "31536000", upsert: false });
      if (uploadError) {
        setMessage("Inline image upload failed: " + uploadError.message);
        return null;
      }
      const { data: publicData } = supabase.storage.from("news-media").getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || title || "Article image";
      const { error: mediaError } = await supabase.from("media").insert({
        file_path: path, public_url: publicData.publicUrl, alt_text: alt, caption: alt,
        uploaded_by: userData.user?.id ?? null,
      });
      if (mediaError) {
        setMessage("Image uploaded, but the media-library record failed: " + mediaError.message);
      }
      return { url: publicData.publicUrl, alt };
    } finally {
      setUploading(false);
    }
  }

  async function syncArticleCategories(articleId: string, names: string[]) {
    const clean = [...new Set(names.length ? names : [category])];
    await supabase.from("article_categories").delete().eq("article_id", articleId);
    const { data: rows } = await supabase.from("categories").select("id,name").in("name", clean);
    if (rows?.length) await supabase.from("article_categories").insert(rows.map((row: { id: string; name: string }, index: number) => ({ article_id: articleId, category_id: row.id, is_primary: row.name === category || index === 0 })));
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

    let existingArticle: { id: string; slug: string; public_path: string | null; status: ArticleStatus; published_at: string | null } | null = null;
    if (editingId) {
      const { data } = await supabase
        .from("articles")
        .select("id,slug,public_path,status,published_at")
        .eq("id", editingId)
        .maybeSingle();
      if (data) {
        existingArticle = {
          id: data.id,
          slug: data.slug,
          public_path: data.public_path,
          status: data.status as ArticleStatus,
          published_at: data.published_at,
        };
      }
    }

    const scheduledAt = requestedStatus === "scheduled" ? new Date(scheduledFor).toISOString() : null;
    const publishedAt = requestedStatus === "scheduled"
      ? scheduledAt
      : requestedStatus === "published"
        ? (publicationDate ? new Date(publicationDate).toISOString() : (originalPublishedAt || new Date().toISOString()))
        : originalPublishedAt;

    const targetStatus = requestedStatus === "scheduled" ? "published" : requestedStatus;
    const computedPublicPath = targetStatus === "published" && publishedAt
      ? `/${new Date(publishedAt).getUTCFullYear()}/${String(new Date(publishedAt).getUTCMonth() + 1).padStart(2, "0")}/${normalizedSlug}.html`
      : null;
    const existingPathDate = existingArticle?.published_at ? new Date(existingArticle.published_at) : null;
    const targetPathDate = publishedAt ? new Date(publishedAt) : null;
    const publicPathIdentityChanged = Boolean(
      existingArticle && (
        existingArticle.slug !== normalizedSlug ||
        (existingPathDate && targetPathDate &&
          (existingPathDate.getUTCFullYear() !== targetPathDate.getUTCFullYear() ||
            existingPathDate.getUTCMonth() !== targetPathDate.getUTCMonth()))
      )
    );
    // Preserve custom and legacy public paths on ordinary edits. Recompute only
    // when a new article is published or the slug / URL month changes.
    const targetPublicPath = computedPublicPath
      ? (existingArticle?.public_path && !publicPathIdentityChanged
          ? existingArticle.public_path
          : computedPublicPath)
      : (existingArticle?.public_path || null);
    const oldPublicPath = existingArticle?.public_path || null;
    const publicPathChanged = Boolean(editingId && oldPublicPath && targetPublicPath && oldPublicPath !== targetPublicPath);

    const payload = {
      title: title.trim(), slug: normalizedSlug, category, author: author.trim() || "Dweep Tulika", excerpt: excerpt.trim(),
      body_html: body, featured_image: featuredImage || null, seo_title: seoTitle.trim() || null,
      meta_description: metaDescription.trim() || excerpt.trim() || null, social_image: socialImage || null,
      status: targetStatus, scheduled_for: scheduledAt,
      published_at: publishedAt, public_path: targetPublicPath,
      updated_by: user.id,
    };
    const query = editingId
      ? supabase.from("articles").update(payload).eq("id", editingId)
      : supabase.from("articles").insert({ ...payload, created_by: user.id });
    const { error } = await query;
    if (error) setMessage(error.message);
    else {
      const { data: saved } = await supabase.from("articles").select("id").eq("slug", normalizedSlug).maybeSingle();
      if (saved?.id) {
        await syncArticleCategories(saved.id, selectedCategories);
      }
      const redirectNote = publicPathChanged ? " Old URL now permanently redirects to the new URL." : "";
      setMessage((requestedStatus === "published" ? "Article published successfully." : requestedStatus === "scheduled" ? "Article scheduled successfully." : "Draft saved successfully.") + redirectNote);
      resetEditor(); await loadArticles();
    }
    setBusy(false);
  }

  async function adoptLegacyArticle(article: LegacyArticle) {
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


  function requestPublish() {
    const missing: string[] = [];
    if (!title.trim()) missing.push("headline");
    if (!body.replace(/<[^>]*>/g, " ").trim()) missing.push("article text");
    if (!selectedCategories.length) missing.push("category");
    if (missing.length) {
      setMessage("Before publishing, please add: " + missing.join(", ") + ".");
      return;
    }
    const recommendedMissing: string[] = [];
    if (!excerpt.trim()) recommendedMissing.push("summary");
    if (!featuredImage) recommendedMissing.push("featured image");
    if (recommendedMissing.length && !window.confirm(
      "This story has no " + recommendedMissing.join(" or ") + ". You can publish without it, but a summary and featured image are recommended. Continue?"
    )) return;
    const action = status === "scheduled" ? "schedule" : "publish";
    if (!window.confirm(
      action === "schedule"
        ? "Schedule this story for the selected date and time?"
        : "Publish this story to the live Dweep Tulika website now?"
    )) return;
    void saveArticle(status === "draft" ? "published" : status);
  }

  async function submit(event: FormEvent) { event.preventDefault(); await saveArticle(editingId ? status : "draft"); }

  if (!sessionReady) return <main className="adminLogin"><p>Checking newsroom access…</p></main>;

  return (
    <main className="adminShell">
      <div className="adminTop">
        <div><div className="kicker">Dweep Tulika Newsroom</div><h1>Editorial Dashboard</h1><p>Authenticated publishing workspace for the digital edition.</p></div>
        <div className="adminHeaderActions"><Link className="adminBack" href="/">View Website</Link><Link className="adminBack" href="/admin/logout">Sign Out</Link></div>
      </div>

      <section className="adminSection">
        <div className="adminSectionHeader"><div><div className="adminLabel">Newsroom overview</div><h2>Today at a glance</h2><p>Editorial workload and the latest newsroom activity.</p></div></div>
        <div className="adminFormGrid">
          <div className="adminStoryRow"><div><span className="adminStatus">Total newsroom</span><h3>{articles.length}</h3><p>Stories in the newsroom database</p></div></div>
          <div className="adminStoryRow"><div><span className="adminStatus">Published total</span><h3>{publishedTotalCount}</h3><p>Currently published newsroom stories</p></div></div>
          <div className="adminStoryRow"><div><span className="adminStatus">Published today</span><h3>{publishedTodayCount}</h3><p>Stories published today</p></div></div>
          <div className="adminStoryRow"><div><span className="adminStatus">Drafts</span><h3>{draftCount}</h3><p>Stories awaiting completion</p></div></div>
          <div className="adminStoryRow"><div><span className="adminStatus">Scheduled</span><h3>{scheduledCount}</h3><p>Stories queued for publication</p></div></div>
        </div>
        <div className="adminFormGrid">
          <div>
            <h3>Recently edited</h3>
            {recentEditedArticles.length ? recentEditedArticles.map(article => <div className="adminStoryRow" key={"recent-" + article.id}><div><span className="adminStatus">{article.status}</span><h3>{article.title}</h3><p>{article.category}</p></div><button type="button" onClick={() => void editArticle(article)}>Edit</button></div>) : <p className="adminNote">No newsroom stories yet.</p>}
          </div>
          <div>
            <h3>Editorial alerts</h3>
            {draftCount > 0 && <p className="adminNote">{draftCount} draft{draftCount === 1 ? "" : "s"} need editorial attention.</p>}
            {scheduledCount > 0 && <p className="adminNote">{scheduledCount} scheduled stor{scheduledCount === 1 ? "y" : "ies"} are in the publishing queue.</p>}
            {draftCount === 0 && scheduledCount === 0 && <p className="adminNote">No outstanding publishing alerts.</p>}
          </div>
        </div>
      </section>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">{editingId ? "Edit Article" : "New Article"}</div><h2>{editingId ? "Update newsroom story" : "Write and publish"}</h2></div><span className="adminStatus">{status}</span></div>
        <form onSubmit={submit}>
          <label>Headline<input required value={title} onChange={e => { setTitle(e.target.value); if (!slug) setSlug(makeSlug(e.target.value)); }} placeholder="Enter the news headline" /></label>
          <label>Slug<input required value={slug} onChange={e => setSlug(makeSlug(e.target.value))} placeholder="article-url-slug" /></label>
          <div className="adminFormGrid">
            <fieldset className="adminCategoryField"><legend>Categories</legend><div className="adminCategoryChecks">{categoryNames.map(item => <label key={item}><input type="checkbox" checked={selectedCategories.includes(item)} onChange={e => { const next = e.target.checked ? [...selectedCategories, item] : selectedCategories.filter(v => v !== item); const safe = next.length ? next : [item]; setSelectedCategories(safe); setCategory(safe[0]); }} /> {item}</label>)}</div></fieldset>
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
            <RichTextEditor key={editingId || "new-article"} value={body} onChange={setBody} onUploadImage={uploadInlineImage} />
          </label>
          <div className="adminActions">
            <button type="button" onClick={() => setPreviewOpen(open => !open)}>{previewOpen ? "Hide Preview" : "Preview Article"}</button>
          </div>
          {previewOpen && <section className="adminSection" aria-label="Article preview">
            <div className="adminSectionHeader"><div><div className="adminLabel">Reader preview</div><h2>{title.trim() || "Your headline will appear here"}</h2></div></div>
            {excerpt.trim() && <p>{excerpt}</p>}
            {featuredImage && <div className="adminImagePreview"><img src={featuredImage} alt={title.trim() ? "Featured image for " + title : "Article featured image"} /></div>}
            <div className="articlebody" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(body) }} />
          </section>}
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
            <button type="button" disabled={busy || uploading} onClick={requestPublish}>{busy ? "Working…" : status === "scheduled" ? "Schedule Article" : "Publish"}</button>
            {editingId && <button type="button" disabled={busy || uploading} onClick={resetEditor}>Cancel Edit</button>}
          </div>
          <p className="adminNote">Published URLs retain the newsroom date/slug format. Media is stored in the Dweep Tulika newsroom library.</p>
        </form>
      </section>

      <AdvertisementPanel />

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Newsroom Library</div><h2>Drafts &amp; published stories</h2></div></div>
        <section className="adminSection">
          <div className="adminSectionHeader"><div><h2>Category Management</h2><p>Manage newsroom categories. Categories currently used by articles cannot be deleted.</p></div></div>
          <div className="adminFormGrid">
            <label>New category<input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category name" /></label>
            <div><button type="button" disabled={categoryBusy || !newCategory.trim()} onClick={() => void addCategory()}>Add category</button></div>
          </div>
          <div className="adminCategoryChecks">
            {categoryRows.map(row => <div key={row.id} className="adminCategoryItem"><span>{row.name}</span><button type="button" disabled={categoryBusy} onClick={() => void deleteCategory(row.id)}>Delete</button></div>)}
          </div>
        </section>

        <div className="adminStoryList">
          <div className="adminFormGrid">
            <label>Search library<input value={libraryQuery} onChange={e => { setLibraryPage(1); setLibraryQuery(e.target.value); }} placeholder="Headline, slug, author or keyword" /></label>
            <label>Category<select value={libraryCategory} onChange={e => { setLibraryPage(1); setLibraryCategory(e.target.value); }}><option>All categories</option>{categoryNames.map(item => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="adminFormGrid">
            <label>Source<select value={librarySource} onChange={e => { setLibraryPage(1); setLibrarySource(e.target.value); }}><option>All sources</option><option value="newsroom">Newsroom</option><option value="blogger">Blogger</option></select></label>
            <label>Published/updated date<input type="date" value={libraryDate} onChange={e => { setLibraryPage(1); setLibraryDate(e.target.value); }} /></label>
          </div>
          <div className="adminFormGrid">
            <label>Status<select value={libraryStatus} onChange={e => { setLibraryPage(1); setLibraryStatus(e.target.value); }}><option>All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>
          </div>
          {pagedArticles.map(article => (
            <article className="adminStoryRow" key={article.id}>
              <div><span className="adminStatus">{article.status}</span><h3>{article.title}</h3><p>{article.category} · {article.published_at ? "Published " : "Updated "}{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(article.published_at || article.updated_at))}</p></div>
              <button type="button" onClick={() => editArticle(article)}>Edit</button>
            </article>
          ))}
          {filteredLegacyArticles.map((legacy: LegacyArticle) => (
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
