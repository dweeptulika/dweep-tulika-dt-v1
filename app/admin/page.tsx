"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = ["Andaman News", "National", "Politics", "Culture", "Business", "Sports"];

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [sessionReady, setSessionReady] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [author, setAuthor] = useState("Dweep Tulika");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useMemo(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/admin/login");
      else setSessionReady(true);
    });
  }, [router, supabase]);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Only JPEG, PNG and WebP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image is larger than the 10 MB newsroom limit.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeBase = makeSlug(file.name.replace(/\.[^.]+$/, "")) || "image";
    const path = `articles/${Date.now()}-${safeBase}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("news-media")
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (uploadError) {
      setMessage(uploadError.message);
      setUploading(false);
      event.target.value = "";
      return;
    }

    const { data: publicData } = supabase.storage
      .from("news-media")
      .getPublicUrl(path);

    const { data: userData } = await supabase.auth.getUser();

    const { error: mediaError } = await supabase.from("media").insert({
      file_path: path,
      public_url: publicData.publicUrl,
      alt_text: title || safeBase.replace(/-/g, " "),
      caption: "",
      uploaded_by: userData.user?.id ?? null,
    });

    if (mediaError) {
      setMessage(`Image uploaded, but media record failed: ${mediaError.message}`);
    } else {
      setFeaturedImage(publicData.publicUrl);
      setMessage("Featured image uploaded successfully.");
    }

    setUploading(false);
    event.target.value = "";
  }

  async function saveArticle(requestedStatus: "draft" | "published") {
    setBusy(true);
    setMessage("");
    setStatus(requestedStatus);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    const finalSlug = slug || makeSlug(title);
    if (!title.trim() || !finalSlug || !body.trim()) {
      setMessage("Headline, slug and article body are required.");
      setBusy(false);
      return;
    }

    const published = requestedStatus === "published";

    const { error } = await supabase.from("articles").insert({
      title: title.trim(),
      slug: finalSlug,
      category,
      author: author.trim() || "Dweep Tulika",
      excerpt: excerpt.trim(),
      body_html: body,
      featured_image: featuredImage || null,
      status: requestedStatus,
      published_at: published ? new Date().toISOString() : null,
      created_by: user.id,
      updated_by: user.id,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        published
          ? "Article published successfully."
          : "Draft saved successfully.",
      );
      setTitle("");
      setSlug("");
      setExcerpt("");
      setBody("");
      setFeaturedImage("");
      setStatus("draft");
    }

    setBusy(false);
  }

  function handleDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveArticle("draft");
  }

  if (!sessionReady) {
    return <main className="adminLogin"><p>Checking newsroom access…</p></main>;
  }

  return (
    <main className="adminShell">
      <div className="adminTop">
        <div>
          <div className="kicker">Dweep Tulika Newsroom</div>
          <h1>Editorial Dashboard</h1>
          <p>Authenticated publishing workspace for the digital edition.</p>
        </div>
        <div className="adminHeaderActions">
          <a className="adminBack" href="/">View Website</a>
          <a className="adminBack" href="/admin/logout">Sign Out</a>
        </div>
      </div>

      <section className="adminEditor">
        <div className="adminEditorHead">
          <div>
            <div className="adminLabel">New Article</div>
            <h2>Write and publish</h2>
          </div>
          <span className="adminStatus">{status}</span>
        </div>

        <form onSubmit={handleDraft}>
          <label>
            Headline
            <input
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slug) setSlug(makeSlug(event.target.value));
              }}
              placeholder="Enter the news headline"
            />
          </label>

          <label>
            Slug
            <input
              required
              value={slug}
              onChange={(event) => setSlug(makeSlug(event.target.value))}
              placeholder="article-url-slug"
            />
          </label>

          <div className="adminFormGrid">
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Author
              <input value={author} onChange={(event) => setAuthor(event.target.value)} />
            </label>
          </div>

          <label>
            Excerpt / SEO summary
            <textarea
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="Short summary for cards and search engines"
            />
          </label>

          <label>
            Featured image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadImage}
              disabled={uploading || busy}
            />
          </label>

          {featuredImage && (
            <div className="adminImagePreview">
              <img src={featuredImage} alt="Selected featured image" />
              <button type="button" onClick={() => setFeaturedImage("")}>
                Remove featured image
              </button>
            </div>
          )}

          <label>
            Article body
            <textarea
              rows={18}
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write HTML-ready article content here..."
            />
          </label>

          {message && <p className="adminMessage">{message}</p>}

          <div className="adminActions">
            <button type="submit" disabled={busy || uploading}>
              {busy && status === "draft" ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={busy || uploading}
              onClick={() => void saveArticle("published")}
            >
              {busy && status === "published" ? "Publishing…" : "Publish"}
            </button>
          </div>

          <p className="adminNote">
            Images are stored in the Dweep Tulika newsroom media library.
            Published articles are protected by Supabase Row Level Security.
          </p>
        </form>
      </section>
    </main>
  );
}
