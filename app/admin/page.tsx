"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";

const categories = ["Andaman News", "National", "Politics", "Culture", "Business", "Sports"];
type ArticleStatus = "draft" | "published" | "scheduled";
type ArticleRow = {
  id: string; title: string; slug: string; category: string; author: string; excerpt: string;
  body_html: string; featured_image: string | null; seo_title: string | null;
  meta_description: string | null; social_image: string | null; status: ArticleStatus;
  scheduled_for: string | null; published_at: string | null; updated_at: string;
};

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sessionReady, setSessionReady] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(categories[0]); const [author, setAuthor] = useState("Dweep Tulika");
  const [excerpt, setExcerpt] = useState(""); const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState(""); const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState(""); const [socialImage, setSocialImage] = useState("");
  const [scheduledFor, setScheduledFor] = useState(""); const [status, setStatus] = useState<ArticleStatus>("draft");
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/admin/login");
      else { setSessionReady(true); void loadArticles(); }
    });
  }, [router, supabase]);

  async function loadArticles() {
    const { data } = await supabase.from("articles")
      .select("id,title,slug,category,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at")
      .order("updated_at", { ascending: false });
    if (data) setArticles(data as ArticleRow[]);
  }

  function resetEditor() {
    setEditingId(null); setTitle(""); setSlug(""); setCategory(categories[0]); setAuthor("Dweep Tulika");
    setExcerpt(""); setBody(""); setFeaturedImage(""); setSeoTitle(""); setMetaDescription("");
    setSocialImage(""); setScheduledFor(""); setStatus("draft"); setOriginalPublishedAt(null); setMessage("");
  }

  function editArticle(article: ArticleRow) {
    setEditingId(article.id); setTitle(article.title); setSlug(article.slug); setCategory(article.category);
    setAuthor(article.author); setExcerpt(article.excerpt); setBody(article.body_html); setFeaturedImage(article.featured_image || "");
    setSeoTitle(article.seo_title || ""); setMetaDescription(article.meta_description || "");
    setSocialImage(article.social_image || ""); setScheduledFor(article.scheduled_for ? article.scheduled_for.slice(0, 16) : "");
    setOriginalPublishedAt(article.published_at);
    setStatus(article.scheduled_for && new Date(article.scheduled_for).getTime() > Date.now() ? "scheduled" : article.status); setMessage("Editing saved newsroom article.");
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
        ? (originalPublishedAt || new Date().toISOString())
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
    else { setMessage(requestedStatus === "published" ? "Article published successfully." : requestedStatus === "scheduled" ? "Article scheduled successfully." : "Draft saved successfully."); resetEditor(); await loadArticles(); }
    setBusy(false);
  }

  async function submit(event: FormEvent) { event.preventDefault(); await saveArticle("draft"); }

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
            <label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
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
          <label>Article body
            <RichTextEditor value={body} onChange={setBody} />
          </label>
          <div className="adminFormGrid">
            <label>Schedule date &amp; time<input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} /></label>
            <label>Publishing status<select value={status} onChange={e => setStatus(e.target.value as ArticleStatus)}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select></label>
          </div>
          {message && <p className="adminMessage">{message}</p>}
          <div className="adminActions">
            <button type="submit" disabled={busy || uploading}>{busy && status === "draft" ? "Saving…" : "Save Draft"}</button>
            <button type="button" disabled={busy || uploading} onClick={() => void saveArticle(status === "draft" ? "published" : status)}>{busy ? "Working…" : status === "scheduled" ? "Schedule Article" : "Publish"}</button>
            {editingId && <button type="button" disabled={busy || uploading} onClick={resetEditor}>Cancel Edit</button>}
          </div>
          <p className="adminNote">Published URLs retain the newsroom date/slug format. Media is stored in the Dweep Tulika newsroom library.</p>
        </form>
      </section>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Newsroom Library</div><h2>Drafts &amp; published stories</h2></div></div>
        <div className="adminStoryList">
          {articles.map(article => (
            <article className="adminStoryRow" key={article.id}>
              <div><span className="adminStatus">{article.status}</span><h3>{article.title}</h3><p>{article.category} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(article.updated_at))}</p></div>
              <button type="button" onClick={() => editArticle(article)}>Edit</button>
            </article>
          ))}
          {articles.length === 0 && <p className="adminNote">No newsroom articles yet.</p>}
        </div>
      </section>
    </main>
  );
}
