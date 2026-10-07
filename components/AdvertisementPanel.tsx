"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AdRow = {
  id: string;
  name: string;
  advertiser: string;
  image_url: string;
  target_url: string | null;
  placement: "homepage" | "article" | "sidebar";
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const placements = [
  ["homepage", "Homepage"],
  ["article", "Article pages"],
  ["sidebar", "Sidebar"],
] as const;

export function AdvertisementPanel() {
  const supabase = createClient();
  const [ads, setAds] = useState<AdRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [advertiser, setAdvertiser] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [placement, setPlacement] = useState<AdRow["placement"]>("homepage");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAds() {
    const { data, error } = await supabase.from("advertisements")
      .select("id,name,advertiser,image_url,target_url,placement,active,starts_at,ends_at")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setAds((data || []) as AdRow[]);
  }

  // The initial data load intentionally happens after mount; keep this effect isolated from the form state updates.\n  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps\n  useEffect(() => { void loadAds(); }, []);

  function reset() {
    setEditingId(null); setName(""); setAdvertiser(""); setImageUrl(""); setTargetUrl("");
    setPlacement("homepage"); setStartsAt(""); setEndsAt(""); setActive(true); setMessage("");
  }

  function editAd(ad: AdRow) {
    setEditingId(ad.id); setName(ad.name); setAdvertiser(ad.advertiser); setImageUrl(ad.image_url);
    setTargetUrl(ad.target_url || ""); setPlacement(ad.placement);
    setStartsAt(ad.starts_at ? ad.starts_at.slice(0, 16) : "");
    setEndsAt(ad.ends_at ? ad.ends_at.slice(0, 16) : "");
    setActive(ad.active); setMessage("Editing advertisement.");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function uploadAd(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) {
      setMessage("Only JPEG, PNG and WebP images are allowed."); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image is larger than the 10 MB newsroom limit."); return;
    }
    setUploading(true); setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safe = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "advertisement";
    const path = "advertisements/" + Date.now() + "-" + safe + "." + extension;
    const { error } = await supabase.storage.from("news-media").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) setMessage(error.message);
    else {
      const { data } = supabase.storage.from("news-media").getPublicUrl(path);
      setImageUrl(data.publicUrl); setMessage("Advertisement image uploaded.");
    }
    setUploading(false); event.target.value = "";
  }

  async function saveAd() {
    if (!name.trim() || !imageUrl) { setMessage("Advertisement name and image are required."); return; }
    setBusy(true); setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setMessage("Please sign in again."); setBusy(false); return; }
    const payload = {
      name: name.trim(), advertiser: advertiser.trim(), image_url: imageUrl,
      target_url: targetUrl.trim() || null, placement, active,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      updated_by: user.id,
    };
    const result = editingId
      ? await supabase.from("advertisements").update(payload).eq("id", editingId)
      : await supabase.from("advertisements").insert({ ...payload, created_by: user.id });
    if (result.error) setMessage(result.error.message);
    else { setMessage(editingId ? "Advertisement updated." : "Advertisement added."); reset(); await loadAds(); }
    setBusy(false);
  }

  async function toggleAd(ad: AdRow) {
    const { error } = await supabase.from("advertisements").update({ active: !ad.active }).eq("id", ad.id);
    if (error) setMessage(error.message); else await loadAds();
  }

  async function deleteAd(ad: AdRow) {
    if (!window.confirm("Delete this advertisement?")) return;
    const { error } = await supabase.from("advertisements").delete().eq("id", ad.id);
    if (error) setMessage(error.message); else { setMessage("Advertisement deleted."); await loadAds(); }
  }

  return <section className="adminEditor">
    <div className="adminEditorHead">
      <div><div className="adminLabel">Advertising</div><h2>Advertisement Control Panel</h2></div>
      <span className="adminStatus">{ads.filter(a => a.active).length} active</span>
    </div>
    <div className="adminFormGrid">
      <label>Advertisement name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ABC Traders — Diwali Offer" /></label>
      <label>Advertiser / business<input value={advertiser} onChange={e => setAdvertiser(e.target.value)} placeholder="Business or organisation name" /></label>
    </div>
    <div className="adminFormGrid">
      <label>Placement<select value={placement} onChange={e => setPlacement(e.target.value as AdRow["placement"])}>{placements.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Click destination URL (optional)<input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://example.com" /><small>Leave blank if the advertisement should not be clickable.</small></label>
    </div>
    <label>Advertisement image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAd} disabled={uploading || busy} /></label>
    {imageUrl && <div className="adminImagePreview"><img src={imageUrl} alt="Advertisement preview" /><button type="button" onClick={() => setImageUrl("")}>Remove image</button></div>}
    <div className="adminFormGrid">
      <label>Start date &amp; time<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} /><small>Leave blank to start immediately when active.</small></label>
      <label>End date &amp; time<input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} /><small>Leave blank for no automatic end date.</small></label>
    </div>
    <label><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
    {message && <p className="adminMessage">{message}</p>}
    <div className="adminActions">
      <button type="button" disabled={busy || uploading} onClick={() => void saveAd()}>{busy ? "Saving…" : editingId ? "Save Advertisement" : "Add Advertisement"}</button>
      {editingId && <button type="button" disabled={busy || uploading} onClick={reset}>Cancel Edit</button>}
    </div>
    <div className="adminStoryList">
      {ads.map(ad => <article className="adminStoryRow" key={ad.id}>
        <div>
          <span className="adminStatus">{ad.active ? "active" : "inactive"} · {ad.placement}</span>
          <h3>{ad.name}</h3>
          <p>{ad.advertiser || "No advertiser name"} · {ad.target_url ? "Link: Yes" : "Link: No"} · {ad.ends_at ? "Ends " + new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(ad.ends_at)) : "No end date"}</p>
        </div>
        <div className="adminActions">
          <button type="button" onClick={() => editAd(ad)}>Edit</button>
          <button type="button" onClick={() => void toggleAd(ad)}>{ad.active ? "Deactivate" : "Activate"}</button>
          <button type="button" onClick={() => void deleteAd(ad)}>Delete</button>
        </div>
      </article>)}
      {ads.length === 0 && <p className="adminNote">No advertisements added yet.</p>}
    </div>
  </section>;
}
