"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AdvertisementPanel } from "@/components/AdvertisementPanel";

const defaultCategories = ["Andaman News", "National", "Politics", "Editorial", "Culture", "Business", "Sports"];
const articleTypes: Array<[string, string]> = [
  ["news", "News report"], ["feature", "Feature"], ["editorial", "Editorial"],
  ["opinion", "Opinion / Column"], ["interview", "Interview"], ["explainer", "Explainer"],
  ["review", "Review"], ["press-release", "Press release"], ["photo-story", "Photo story"],
  ["video", "Video"], ["live-blog", "Live blog"],
];
type ArticleStatus = "draft" | "published" | "scheduled";
type ArticleRow = {
  id: string; title: string; slug: string; category: string; category_names?: string[]; primary_category?: string; article_type?: string; series_name?: string; source?: "blogger" | "newsroom"; public_path?: string | null; author: string; excerpt: string;
  body_html: string; featured_image: string | null; seo_title: string | null;
  meta_description: string | null; social_image: string | null; status: ArticleStatus;
  scheduled_for: string | null; published_at: string | null; updated_at: string;
};
type LegacyArticle = {
  id: string; title: string; slug: string; publicPath: string; category: string;
  author: string; excerpt: string; featuredImage: string | null;
  publishedAt: string; updatedAt: string; labels: string[];
};

function normalizePublicPath(value: string) {
  try { return new URL(value, "https://dweeptulika.in").pathname.replace(/\/+$/, "") || "/"; }
  catch { return (value.startsWith("/") ? value : "/" + value).replace(/\/+$/, "") || "/"; }
}

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
  const [activeTab, setActiveTab] = useState<"write" | "ads" | "stories">("write");
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [categoryLinksReady, setCategoryLinksReady] = useState(false);
  const [articleTypeReady, setArticleTypeReady] = useState(false);
  const [seriesReady, setSeriesReady] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articleLoadError, setArticleLoadError] = useState<string | null>(null);
  const [legacyArticles, setLegacyArticles] = useState<LegacyArticle[]>([]);
  const [legacyLoadError, setLegacyLoadError] = useState(false);
  const [legacyPage, setLegacyPage] = useState(1);
  const adoptionDisabledForPreview = useSyncExternalStore(
    () => () => {},
    () => window.location.hostname.endsWith(".vercel.app"),
    () => true,
  );
  const [librarySource, setLibrarySource] = useState<"all" | "newsroom" | "blogger">("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryStatus, setLibraryStatus] = useState<"all" | ArticleStatus>("all");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [librarySort, setLibrarySort] = useState<"updated" | "published" | "title">("updated");
  const [libraryPage, setLibraryPage] = useState(1);
  const libraryPageSize = 20;
  const filteredArticles = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return articles.filter(article => {
      const matchesQuery = !query || [article.title, article.slug, article.excerpt, article.author]
        .some(value => (value || "").toLowerCase().includes(query));
      const effectiveStatus = article.scheduled_for && new Date(article.scheduled_for).getTime() > Date.now()
        ? "scheduled" : article.status;
      const matchesSource = librarySource === "all" || (librarySource === "blogger" ? article.source === "blogger" : article.source !== "blogger");
      return matchesQuery
        && matchesSource
        && (libraryStatus === "all" || effectiveStatus === libraryStatus)
        && (libraryCategory === "all" || article.category === libraryCategory || (article.category_names || []).includes(libraryCategory));
    }).sort((a, b) => {
      if (librarySort === "title") return a.title.localeCompare(b.title);
      if (librarySort === "published") return new Date(b.published_at || b.updated_at).getTime() - new Date(a.published_at || a.updated_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [articles, librarySearch, libraryStatus, libraryCategory, librarySort, librarySource]);
  const libraryPageCount = Math.max(1, Math.ceil(filteredArticles.length / libraryPageSize));
  const pagedArticles = filteredArticles.slice((libraryPage - 1) * libraryPageSize, libraryPage * libraryPageSize);
  const availableLegacyArticles = useMemo(() => legacyArticles.filter(legacy =>
    !articles.some(article => Boolean(article.public_path) && normalizePublicPath(article.public_path || "") === normalizePublicPath(legacy.publicPath))
  ), [legacyArticles, articles]);
  const filteredLegacyArticles = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return availableLegacyArticles.filter(legacy => {
      const matchesQuery = !query || [legacy.title, legacy.slug, legacy.excerpt, legacy.author, legacy.category, legacy.publicPath, ...legacy.labels]
        .some(value => (value || "").toLowerCase().includes(query));
      const matchesStatus = libraryStatus === "all" || libraryStatus === "published";
      const matchesCategory = libraryCategory === "all" || legacy.category === libraryCategory || legacy.labels.includes(libraryCategory);
      const matchesSource = librarySource === "all" || librarySource === "blogger";
      return matchesQuery && matchesStatus && matchesCategory && matchesSource;
    }).sort((a, b) => Date.parse(b.updatedAt || b.publishedAt) - Date.parse(a.updatedAt || a.publishedAt));
  }, [availableLegacyArticles, librarySearch, libraryStatus, libraryCategory, librarySource]);
  const legacyPageSize = 20;
  const legacyPageCount = Math.max(1, Math.ceil(filteredLegacyArticles.length / legacyPageSize));
  const pagedLegacyArticles = filteredLegacyArticles.slice((legacyPage - 1) * legacyPageSize, legacyPage * legacyPageSize);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(defaultCategories[0]); const [selectedCategories, setSelectedCategories] = useState<string[]>([defaultCategories[0]]); const [articleType, setArticleType] = useState("news"); const [seriesName, setSeriesName] = useState(""); const [author, setAuthor] = useState("Dweep Tulika");
  const [excerpt, setExcerpt] = useState(""); const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState(""); const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState(""); const [socialImage, setSocialImage] = useState("");
  const [scheduledFor, setScheduledFor] = useState(""); const [publicationDate, setPublicationDate] = useState(""); const [status, setStatus] = useState<ArticleStatus>("draft");
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/admin/login");
      else { setSessionReady(true); void loadArticles(); }
    });
  }, [router, supabase]);

  async function loadArticles() {
    setArticlesLoading(true);
    setArticleLoadError(null);
    try {
      const withType = await supabase.from("articles")
        .select("id,title,slug,category,article_type,source,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at")
        .order("updated_at", { ascending: false });
      let baseRows: ArticleRow[];
      if (withType.error) {
        const fallback = await supabase.from("articles")
          .select("id,title,slug,category,source,public_path,author,excerpt,body_html,featured_image,seo_title,meta_description,social_image,status,scheduled_for,published_at,updated_at")
          .order("updated_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        baseRows = (fallback.data || []) as ArticleRow[];
      } else {
        baseRows = (withType.data || []) as ArticleRow[];
      }
      let rows = baseRows.map(article => ({ ...article, category_names: [article.category], primary_category: article.category, article_type: article.article_type || "news" }));
      const { data: categoryData, error: categoryError } = await supabase.from("categories").select("id,name,slug").order("name");
      if (!categoryError && categoryData) {
        setCategoryOptions(categoryData as Array<{ id: string; name: string; slug: string }>);
        const { data: linkData, error: linkError } = await supabase
          .from("article_categories")
          .select("article_id,is_primary,category:categories(name)");
        if (!linkError && linkData) {
          const linksByArticle = new Map<string, Array<{ name: string; primary: boolean }>>();
          for (const link of linkData as Array<{ article_id: string; is_primary: boolean; category?: { name?: string } | null }>) {
            const name = link.category?.name;
            if (!name) continue;
            const current = linksByArticle.get(link.article_id) || [];
            current.push({ name, primary: link.is_primary });
            linksByArticle.set(link.article_id, current);
          }
          rows = baseRows.map(article => {
            const assigned = linksByArticle.get(article.id) || [];
            return {
              ...article,
              category_names: assigned.length ? assigned.map(item => item.name) : [article.category],
              primary_category: assigned.find(item => item.primary)?.name || article.category,
              article_type: article.article_type || "news",
            };
          });
          setCategoryLinksReady(true);
        } else {
          setCategoryLinksReady(false);
        }
      } else {
        setCategoryOptions([]);
        setCategoryLinksReady(false);
      }
      const { data: seriesLinks, error: seriesError } = await supabase.from("article_series").select("article_id,series:series(name)");
      if (!seriesError && seriesLinks) {
        const seriesByArticle = new Map<string, string>();
        for (const link of seriesLinks as Array<{ article_id: string; series?: { name?: string } | null }>) {
          if (link.series?.name) seriesByArticle.set(link.article_id, link.series.name);
        }
        rows = rows.map(article => ({ ...article, series_name: seriesByArticle.get(article.id) || "" }));
        setSeriesReady(true);
      } else setSeriesReady(false);
      const { error: typeError } = await supabase.from("articles").select("article_type").limit(1);
      setArticleTypeReady(!typeError);
      setArticles(rows);
    } catch (error) {
      setArticleLoadError(error instanceof Error ? error.message : "Could not load newsroom articles.");
      setArticles([]);
    } finally {
      setArticlesLoading(false);
    }
    try {
      const response = await fetch("/api/admin/legacy-articles", { cache: "no-store" });
      if (!response.ok) throw new Error("Legacy archive request failed");
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error("Unexpected legacy archive response");
      setLegacyArticles(result as LegacyArticle[]);
      setLegacyLoadError(false);
    } catch {
      setLegacyArticles([]);
      setLegacyLoadError(true);
    }
  }

  async function adoptLegacyArticle(summary: LegacyArticle) {
    if (adoptionDisabledForPreview) {
      setMessage("Adoption is disabled on preview domains because they share production data. Test the archive here; adopt only from the production domain or after a safe test database is configured.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/admin/login");
        return;
      }
      const detailResponse = await fetch("/api/admin/legacy-articles?path=" + encodeURIComponent(summary.publicPath), { cache: "no-store" });
      if (!detailResponse.ok) {
        setMessage(detailResponse.status === 404 ? "This legacy story could not be found in the source archive." : "Could not load the legacy story. Please retry.");
        return;
      }
      const article = await detailResponse.json() as LegacyArticle & { bodyHtml: string };
      const { data: existing, error: duplicateCheckError } = await supabase.from("articles")
        .select("id").eq("public_path", article.publicPath).maybeSingle();
      if (duplicateCheckError) {
        setMessage("Could not verify whether this story was already adopted: " + duplicateCheckError.message);
        return;
      }
      if (existing) {
        setMessage("This Blogger article has already been adopted. Refresh the library to see it under newsroom stories.");
        await loadArticles();
        return;
      }
      const publishedAt = new Date(article.publishedAt);
      if (!Number.isFinite(publishedAt.getTime())) {
        setMessage("The legacy story has no valid publication date, so it was not adopted.");
        return;
      }
      const { data: inserted, error } = await supabase.from("articles").insert({
        title: article.title, slug: article.slug, category: article.category,
        source: "blogger", legacy_id: article.id, legacy_url: article.publicPath,
        public_path: article.publicPath, author: article.author || "Dweep Tulika",
        excerpt: article.excerpt || "", body_html: article.bodyHtml || "",
        featured_image: article.featuredImage, seo_title: article.title,
        meta_description: article.excerpt || null, status: "published",
        published_at: publishedAt.toISOString(), created_by: userData.user.id, updated_by: userData.user.id,
      }).select("id").single();
      if (error || !inserted) {
        setMessage(error?.message || "The story could not be adopted. No existing story was overwritten.");
        return;
      }
      const adoptedNames = defaultCategories.filter(name => [article.category, ...article.labels].some(label => label.toLowerCase() === name.toLowerCase()));
      const adoptedCategories = categoryOptions.filter(item => adoptedNames.includes(item.name));
      if (categoryLinksReady && adoptedCategories.length) {
        const categoryLinks = adoptedCategories.map(item => ({
          article_id: inserted.id,
          category_id: item.id,
          is_primary: item.name === article.category || (!adoptedNames.includes(article.category) && item.name === adoptedCategories[0].name),
        }));
        const { error: categoryError } = await supabase.from("article_categories")
          .upsert(categoryLinks, { onConflict: "article_id,category_id" });
        if (categoryError) {
          setMessage("Legacy story was adopted, but category assignments need attention: " + categoryError.message);
        }
      }
      setEditingId(inserted.id);
      setTitle(article.title); setSlug(article.slug); setCategory(article.category);
      const legacyCategoryNames = defaultCategories.filter(name => [article.category, ...article.labels].some(label => label.toLowerCase() === name.toLowerCase()));
      setSelectedCategories(legacyCategoryNames.length ? legacyCategoryNames : [article.category]);
      setArticleType("news"); setSeriesName("");
      setAuthor(article.author || "Dweep Tulika"); setExcerpt(article.excerpt || ""); setBody(article.bodyHtml || "");
      setFeaturedImage(article.featuredImage || ""); setSeoTitle(article.title);
      setMetaDescription(article.excerpt || ""); setSocialImage(""); setScheduledFor("");
      setPublicationDate(toLocalDateTimeInput(publishedAt.toISOString()));
      setOriginalPublishedAt(publishedAt.toISOString()); setStatus("published");
      setMessage("Legacy Blogger story adopted into the newsroom as published. Its original public URL and publication date are preserved; the source archive remains unchanged.");
      await loadArticles();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessage("The legacy story could not be adopted. The source archive remains unchanged.");
    } finally {
      setBusy(false);
    }
  }

  function resetEditor() {
    setEditingId(null); setTitle(""); setSlug(""); setCategory(defaultCategories[0]); setSelectedCategories([defaultCategories[0]]); setArticleType("news"); setSeriesName(""); setAuthor("Dweep Tulika");
    setExcerpt(""); setBody(""); setFeaturedImage(""); setSeoTitle(""); setMetaDescription("");
    setSocialImage(""); setScheduledFor(""); setPublicationDate(""); setStatus("draft"); setOriginalPublishedAt(null); setMessage("");
  }

  function editArticle(article: ArticleRow) {
    setEditingId(article.id); setTitle(article.title); setSlug(article.slug); setCategory(article.primary_category || article.category); setSelectedCategories(article.category_names?.length ? article.category_names : [article.category]); setArticleType(article.article_type || "news"); setSeriesName(article.series_name || "");
    setAuthor(article.author); setExcerpt(article.excerpt); setBody(article.body_html); setFeaturedImage(article.featured_image || "");
    setSeoTitle(article.seo_title || ""); setMetaDescription(article.meta_description || "");
    setSocialImage(article.social_image || ""); setScheduledFor(toLocalDateTimeInput(article.scheduled_for));
    setPublicationDate(toLocalDateTimeInput(article.published_at));
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

  async function uploadInlineImage(file: File): Promise<string | null> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Only JPEG, PNG and WebP images are allowed.");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image is larger than the 10 MB newsroom limit.");
      return null;
    }
    if (uploading || busy) {
      setMessage("Wait for the current newsroom operation to finish.");
      return null;
    }

    setUploading(true);
    setMessage("Uploading inline image…");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeBase = makeSlug(file.name.replace(/\.[^.]+$/, "")) || "article-image";
    const path = "articles/" + Date.now() + "-" + safeBase + "." + extension;

    try {
      const { error: uploadError } = await supabase.storage
        .from("news-media")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (uploadError) {
        setMessage("Inline image upload failed: " + uploadError.message);
        return null;
      }

      const { data: publicData } = supabase.storage.from("news-media").getPublicUrl(path);
      const { data: userData } = await supabase.auth.getUser();
      const { error: mediaError } = await supabase.from("media").insert({
        file_path: path,
        public_url: publicData.publicUrl,
        alt_text: title || safeBase.replace(/-/g, " "),
        caption: "",
        uploaded_by: userData.user?.id ?? null,
      });

      setMessage(mediaError
        ? "Image uploaded; media-library record needs attention: " + mediaError.message
        : "Inline image uploaded. Add alt text and an optional caption.");
      return publicData.publicUrl;
    } catch {
      setMessage("Inline image upload failed. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function saveArticle(requestedStatus: ArticleStatus) {
    setBusy(true); setMessage("");
    const { data: userData } = await supabase.auth.getUser(); const user = userData.user;
    if (!user) { router.replace("/admin/login"); return; }
    const finalSlug = slug || makeSlug(title);
    if (!title.trim() || !finalSlug || !body.trim()) { setMessage("Headline, slug and article body are required."); setBusy(false); return; }
    if (categoryLinksReady && selectedCategories.length === 0) { setMessage("Choose at least one category."); setBusy(false); return; }
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
      ...(articleTypeReady ? { article_type: articleType } : {}),
    };
    const query = editingId
      ? supabase.from("articles").update(payload).eq("id", editingId).select("id").single()
      : supabase.from("articles").insert({ ...payload, created_by: user.id }).select("id").single();
    const { data: saved, error } = await query;
    if (error || !saved) {
      setMessage(error?.message || "The article could not be saved.");
      setBusy(false);
      return;
    }
    if (categoryLinksReady) {
      const chosen = categoryOptions.filter(item => selectedCategories.includes(item.name));
      if (!chosen.length) {
        setMessage("Article saved, but no valid category IDs were available. Keep the editor open and retry after refreshing the category list.");
        setEditingId(saved.id);
        setBusy(false);
        return;
      }
      const links = chosen.map(item => ({ article_id: saved.id, category_id: item.id, is_primary: item.name === category }));
      const { error: linkSaveError } = await supabase.from("article_categories").upsert(links, { onConflict: "article_id,category_id" });
      if (linkSaveError) {
        setMessage("Article saved, but category assignments failed: " + linkSaveError.message);
        setEditingId(saved.id);
        setBusy(false);
        return;
      }
      const keepIds = chosen.map(item => '"' + item.id + '"').join(",");
      const { error: removeError } = await supabase.from("article_categories")
        .delete().eq("article_id", saved.id).not("category_id", "in", "(" + keepIds + ")");
      if (removeError) {
        setMessage("Article saved and selected categories assigned, but old category links could not be cleared: " + removeError.message);
        setEditingId(saved.id);
        setBusy(false);
        return;
      }
    }
    if (seriesReady) {
      const trimmedSeries = seriesName.trim();
      if (trimmedSeries) {
        const seriesSlug = makeSlug(trimmedSeries);
        if (!seriesSlug) {
          setMessage("Article saved, but the series name is invalid.");
          setEditingId(saved.id);
          setBusy(false);
          return;
        }
        const seriesResult = await supabase.from("series")
          .upsert({ name: trimmedSeries, slug: seriesSlug }, { onConflict: "slug" })
          .select("id").single();
        if (seriesResult.error || !seriesResult.data) {
          setMessage("Article saved, but series could not be saved: " + (seriesResult.error?.message || "Unknown error"));
          setEditingId(saved.id);
          setBusy(false);
          return;
        }
        const assignResult = await supabase.from("article_series")
          .upsert({ article_id: saved.id, series_id: seriesResult.data.id }, { onConflict: "article_id,series_id" });
        if (assignResult.error) {
          setMessage("Article saved, but series assignment failed: " + assignResult.error.message);
          setEditingId(saved.id);
          setBusy(false);
          return;
        }
        await supabase.from("article_series").delete().eq("article_id", saved.id).neq("series_id", seriesResult.data.id);
      } else {
        await supabase.from("article_series").delete().eq("article_id", saved.id);
      }
    }
    setMessage(requestedStatus === "published" ? "Article published successfully." : requestedStatus === "scheduled" ? "Article scheduled successfully." : "Draft saved successfully.");
    resetEditor();
    await loadArticles();
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

      <nav className="adminTabs" role="tablist" aria-label="Editorial dashboard sections">
        <button type="button" role="tab" aria-selected={activeTab === "write"} className={activeTab === "write" ? "adminTabButton isActive" : "adminTabButton"} onClick={() => setActiveTab("write")}>Write and publish</button>
        <button type="button" role="tab" aria-selected={activeTab === "ads"} className={activeTab === "ads" ? "adminTabButton isActive" : "adminTabButton"} onClick={() => setActiveTab("ads")}>Advertisement Control Panel</button>
        <button type="button" role="tab" aria-selected={activeTab === "stories"} className={activeTab === "stories" ? "adminTabButton isActive" : "adminTabButton"} onClick={() => setActiveTab("stories")}>Drafts &amp; published stories</button>
      </nav>

      {activeTab === "write" && (
      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">{editingId ? "Edit Article" : "New Article"}</div><h2>{editingId ? "Update newsroom story" : "Write and publish"}</h2></div><span className="adminStatus">{status}</span></div>
        <form onSubmit={submit}>
          <label>Headline<input required value={title} onChange={e => { setTitle(e.target.value); if (!slug) setSlug(makeSlug(e.target.value)); }} placeholder="Enter the news headline" /></label>
          <label>Slug<input required value={slug} onChange={e => setSlug(makeSlug(e.target.value))} placeholder="article-url-slug" /></label>
          <div className="adminFormGrid">
            <div>
              <div className="adminLabel">Categories</div>
              <div className="adminNote">Choose every section where this story should appear. Legacy articles keep their original category unless you change it here.</div>
              <div className="adminCategoryChecks">
                {(categoryOptions.length ? categoryOptions.map(item => item.name) : defaultCategories).map(item => (
                  <label key={item} className="adminCheckLabel">
                    <input type="checkbox" checked={selectedCategories.includes(item)} disabled={!categoryLinksReady}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...selectedCategories, item]
                          : selectedCategories.filter(value => value !== item);
                        if (next.length === 0) return;
                        setSelectedCategories(next);
                        if (!next.includes(category)) setCategory(next[0]);
                      }} />
                    {item}
                  </label>
                ))}
              </div>
              {!categoryLinksReady && <p className="adminNote">Multi-category editing becomes available after the category migration is applied.</p>}
            </div>
            <div>
              <label>Primary category<select value={category} onChange={e => {
                setCategory(e.target.value);
                setSelectedCategories(current => current.includes(e.target.value) ? current : [...current, e.target.value]);
              }}>{(selectedCategories.length ? selectedCategories : [category]).map(item => <option key={item}>{item}</option>)}</select></label>
              <label>Article type<select value={articleType} disabled={!articleTypeReady} onChange={e => setArticleType(e.target.value)}>{articleTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {!articleTypeReady && <p className="adminNote">Article types become editable after the taxonomy migration is applied.</p>}
              <label>Series (optional)<input value={seriesName} disabled={!seriesReady} onChange={e => setSeriesName(e.target.value)} placeholder="e.g. Rajneeti Ke Chehre" /></label>
              {!seriesReady && <p className="adminNote">Series assignment becomes available after the series migration is applied.</p>}
              <label>Author<input value={author} onChange={e => setAuthor(e.target.value)} /></label>
            </div>
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
          {featuredImage && (body.includes(featuredImage)
            ? <div className="adminNote">The featured image is already embedded in the article body, so its duplicate preview is hidden. The featured-image metadata is preserved. <button type="button" onClick={() => setFeaturedImage("")}>Remove featured image</button></div>
            : <div className="adminImagePreview"><img src={featuredImage} alt="Selected featured image" /><button type="button" onClick={() => setFeaturedImage("")}>Remove featured image</button></div>)}
          {socialImage && <div className="adminImagePreview"><img src={socialImage} alt="Selected social image" /><button type="button" onClick={() => setSocialImage("")}>Remove social image</button></div>}
          <label>Article body
            <RichTextEditor value={body} onChange={setBody} onUploadImage={uploadInlineImage} />
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
      )}

      {activeTab === "ads" && <AdvertisementPanel />}

      {activeTab === "stories" && <>
      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Newsroom Library</div><h2>Drafts &amp; published stories</h2></div></div>
        <div className="adminLibraryControls">
          <label>Search articles<input type="search" value={librarySearch} onChange={e => { setLibrarySearch(e.target.value); setLibraryPage(1); setLegacyPage(1); }} placeholder="Headline, keyword, slug, author…" /></label>
          <div className="adminFormGrid">
            <label>Status<select value={libraryStatus} onChange={e => { setLibraryStatus(e.target.value as "all" | ArticleStatus); setLibraryPage(1); setLegacyPage(1); }}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option><option value="scheduled">Scheduled</option></select></label>
            <label>Source<select value={librarySource} onChange={e => { setLibrarySource(e.target.value as "all" | "newsroom" | "blogger"); setLibraryPage(1); setLegacyPage(1); }}><option value="all">All sources</option><option value="newsroom">Newsroom</option><option value="blogger">Legacy Blogger</option></select></label>
            <label>Category / Blogger label<select value={libraryCategory} onChange={e => { setLibraryCategory(e.target.value); setLibraryPage(1); setLegacyPage(1); }}><option value="all">All categories</option>{Array.from(new Set([...articles.map(article => article.category), ...articles.flatMap(article => article.category_names || []), ...legacyArticles.map(article => article.category), ...legacyArticles.flatMap(article => article.labels)])).sort().map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Sort by<select value={librarySort} onChange={e => { setLibrarySort(e.target.value as "updated" | "published" | "title"); setLibraryPage(1); }}><option value="updated">Recently updated</option><option value="published">Publication date</option><option value="title">Headline A–Z</option></select></label>
          </div>
          <p className="adminNote">{filteredArticles.length} article{filteredArticles.length === 1 ? "" : "s"} found · Showing page {Math.min(libraryPage, libraryPageCount)} of {libraryPageCount}</p>
        </div>
        <div className="adminStoryList">
          {pagedArticles.map(article => (
            <article className="adminStoryRow" key={article.id}>
              <div><span className="adminStatus">{article.scheduled_for && new Date(article.scheduled_for).getTime() > Date.now() ? "scheduled" : article.status}</span><h3>{article.title}</h3><p>{article.category} · {article.published_at ? "Published " : "Updated "}{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(article.published_at || article.updated_at))}</p></div>
              <button type="button" onClick={() => editArticle(article)}>Edit</button>
            </article>
          ))}
          {articlesLoading && <p className="adminNote" role="status">Loading newsroom articles…</p>}
          {!articlesLoading && articleLoadError && <div className="adminNote" role="alert"><p>Newsroom articles could not be loaded. This is a loading error, not an empty library.</p><p>{articleLoadError}</p><button type="button" onClick={() => void loadArticles()}>Retry loading articles</button></div>}
          {!articlesLoading && !articleLoadError && articles.length === 0 && <p className="adminNote">No newsroom articles yet.</p>}
          {!articlesLoading && !articleLoadError && articles.length > 0 && filteredArticles.length === 0 && <p className="adminNote">No articles match these filters. Try a different keyword or clear the filters.</p>}
        </div>
        {filteredArticles.length > libraryPageSize && <div className="adminActions">
          <button type="button" disabled={libraryPage <= 1} onClick={() => setLibraryPage(page => Math.max(1, page - 1))}>Previous</button>
          <button type="button" disabled={libraryPage >= libraryPageCount} onClick={() => setLibraryPage(page => Math.min(libraryPageCount, page + 1))}>Next</button>
        </div>}
      </section>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Legacy Archive</div><h2>Blogger stories</h2></div><span className="adminStatus">Legacy source</span></div>
        <p className="adminNote">These stories are read from the original archive. Viewing or searching does not modify them. Use “Adopt &amp; Edit” only when you want to create a newsroom-managed copy while retaining the original public URL.</p>
        {adoptionDisabledForPreview && <p className="adminNote">Preview safety is enabled: adoption is disabled on Vercel preview domains because this project shares production Supabase settings.</p>}
        <div className="adminStoryList">
          {pagedLegacyArticles.map(legacy => (
            <article className="adminStoryRow" key={"legacy-" + legacy.id}>
              <div><span className="adminStatus">blogger</span><h3>{legacy.title}</h3><p>{legacy.category}{legacy.labels.length ? ` · Labels: ${legacy.labels.join(", ")}` : ""} · {legacy.publicPath} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(legacy.publishedAt))}</p></div>
              <button type="button" disabled={busy || adoptionDisabledForPreview} onClick={() => void adoptLegacyArticle(legacy)}>Adopt &amp; Edit</button>
            </article>
          ))}
          {legacyLoadError && <p className="adminNote">The legacy archive could not be loaded. Refresh the page to retry; newsroom stories remain available.</p>}
          {!legacyLoadError && filteredLegacyArticles.length === 0 && <p className="adminNote">No legacy stories match these filters, or all matching stories have already been adopted.</p>}
        </div>
        {filteredLegacyArticles.length > legacyPageSize && <div className="adminActions">
          <button type="button" disabled={legacyPage <= 1} onClick={() => setLegacyPage(page => Math.max(1, page - 1))}>Previous</button>
          <span>Page {Math.min(legacyPage, legacyPageCount)} of {legacyPageCount} · {filteredLegacyArticles.length} legacy stories</span>
          <button type="button" disabled={legacyPage >= legacyPageCount} onClick={() => setLegacyPage(page => Math.min(legacyPageCount, page + 1))}>Next</button>
        </div>}
      </section>
      </>}
    </main>
  );
}
