"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = ["Andaman News","National","Politics","Culture","Business","Sports"];

function makeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [sessionReady,setSessionReady]=useState(false);
  const [title,setTitle]=useState("");
  const [slug,setSlug]=useState("");
  const [category,setCategory]=useState(categories[0]);
  const [author,setAuthor]=useState("Dweep Tulika");
  const [excerpt,setExcerpt]=useState("");
  const [body,setBody]=useState("");
  const [status,setStatus]=useState<"draft"|"published">("draft");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      if (!data.session) router.replace("/admin/login");
      else setSessionReady(true);
    });
  }, [router,supabase]);

  useEffect(() => {
    if (title && !slug) setSlug(makeSlug(title));
  }, [title,slug]);

  async function saveArticle(e: FormEvent, requestedStatus: "draft"|"published") {
    e.preventDefault();
    setBusy(true); setMessage("");
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) { router.replace("/admin/login"); return; }

    const published = requestedStatus === "published";
    const { error } = await supabase.from("articles").insert({
      title, slug: slug || makeSlug(title), category, author, excerpt,
      body_html: body, status,
      published_at: published ? new Date().toISOString() : null,
      created_by: user.id, updated_by: user.id,
    });

    if (error) setMessage(error.message);
    else {
      setMessage(published ? "Article published successfully." : "Draft saved successfully.");
      setTitle(""); setSlug(""); setExcerpt(""); setBody("");
    }
    setBusy(false);
  }

  if (!sessionReady) return <main className="adminLogin"><p>Checking newsroom access…</p></main>;

  return <main className="adminShell">
    <div className="adminTop">
      <div><div className="kicker">Dweep Tulika Newsroom</div><h1>Editorial Dashboard</h1><p>Authenticated publishing workspace for the digital edition.</p></div>
      <div className="adminHeaderActions"><a className="adminBack" href="/">View Website</a><a className="adminBack" href="/admin/logout">Sign Out</a></div>
    </div>

    <section className="adminEditor">
      <div className="adminEditorHead"><div><div className="adminLabel">New Article</div><h2>Write and publish</h2></div><span className="adminStatus">{status}</span></div>
      <form onSubmit={(e)=>saveArticle(e, "draft")}>
        <label>Headline<input required value={title} onChange={e=>{setTitle(e.target.value);setSlug("");}} placeholder="Enter the news headline" /></label>
        <label>Slug<input required value={slug} onChange={e=>setSlug(makeSlug(e.target.value))} placeholder="article-url-slug" /></label>
        <div className="adminFormGrid">
          <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Author<input value={author} onChange={e=>setAuthor(e.target.value)} /></label>
        </div>
        <label>Excerpt / SEO summary<textarea rows={3} value={excerpt} onChange={e=>setExcerpt(e.target.value)} placeholder="Short summary for cards and search engines" /></label>
        <label>Article body<textarea rows={16} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Write HTML-ready article content here..." /></label>
        {message && <p className="adminMessage">{message}</p>}
        <div className="adminActions">
          <button type="submit" disabled={busy} onClick={()=>setStatus("draft")}>{busy ? "Saving…" : "Save Draft"}</button>
          <button type="submit" disabled={busy} onClick={()=>setStatus("published")}>Publish</button>
        </div>
      </form>
    </section>
  </main>;
}
