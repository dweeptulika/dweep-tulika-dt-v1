"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TeamMember = {
  id: string;
  name: string;
  designation: string;
  department: string;
  biography: string;
  tagline: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

const emptyForm = {
  name: "", designation: "", department: "Editorial", biography: "",
  tagline: "", image_url: "", sort_order: "100", is_active: true,
};

export default function TeamManager() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function loadMembers() {
    const { data, error } = await supabase.from("team_members")
      .select("id,name,designation,department,biography,tagline,image_url,sort_order,is_active")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) { setMessage("Could not load team profiles. " + error.message); return; }
    setMembers((data || []) as TeamMember[]);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/admin/login"); return; }
      const { data: profile } = await supabase.from("editorial_profiles")
        .select("role").eq("id", auth.user.id).maybeSingle();
      if (!profile || profile.role !== "admin") {
        router.replace("/admin?error=admin_required");
        return;
      }
      if (alive) { await loadMembers(); setReady(true); }
    })();
    return () => { alive = false; };
  }, [router, supabase]);

  function edit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name, designation: member.designation, department: member.department,
      biography: member.biography, tagline: member.tagline || "", image_url: member.image_url || "",
      sort_order: String(member.sort_order), is_active: member.is_active,
    });
    setMessage("Editing " + member.name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditingId(null); setForm(emptyForm); setMessage(""); }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Only JPEG, PNG and WebP photographs are supported."); return;
    }
    if (file.size > 5 * 1024 * 1024) { setMessage("Photograph must be 5 MB or smaller."); return; }
    setPhotoBusy(true); setMessage("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team-member";
    const path = "team/" + Date.now() + "-" + safeName + "." + ext;
    const { error } = await supabase.storage.from("news-media").upload(path, file, {
      cacheControl: "31536000", contentType: file.type, upsert: false,
    });
    if (error) setMessage("Photo upload failed: " + error.message);
    else {
      const { data } = supabase.storage.from("news-media").getPublicUrl(path);
      setForm(current => ({ ...current, image_url: data.publicUrl }));
      setMessage("Photograph uploaded. Save the profile to publish it.");
    }
    setPhotoBusy(false);
    event.target.value = "";
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.replace("/admin/login"); return; }
    const payload = {
      name: form.name.trim(), designation: form.designation.trim(),
      department: form.department.trim() || "Editorial", biography: form.biography.trim(),
      tagline: form.tagline.trim() || null, image_url: form.image_url.trim() || null,
      sort_order: Math.max(0, Number.parseInt(form.sort_order, 10) || 0),
      is_active: form.is_active, updated_by: auth.user.id,
    };
    const query = editingId
      ? supabase.from("team_members").update(payload).eq("id", editingId)
      : supabase.from("team_members").insert({ ...payload, created_by: auth.user.id });
    const { error } = await query;
    if (error) setMessage("Could not save profile: " + error.message);
    else { setMessage(editingId ? "Team profile updated." : "Team member added."); reset(); await loadMembers(); }
    setBusy(false);
  }

  async function remove(member: TeamMember) {
    if (!window.confirm("Permanently delete " + member.name + "'s profile?")) return;
    setBusy(true);
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);
    setMessage(error ? "Could not delete profile: " + error.message : "Profile deleted.");
    if (!error) { if (editingId === member.id) reset(); await loadMembers(); }
    setBusy(false);
  }

  if (!ready) return <main className="adminLogin"><p>Checking administrator access…</p></main>;

  return (
    <main className="adminShell">
      <div className="adminTop">
        <div><div className="kicker">Dweep Tulika Newsroom</div><h1>Manage Editorial Team</h1><p>Add and maintain the people featured on the public About page.</p></div>
        <div className="adminHeaderActions"><Link className="adminBack" href="/admin">Editorial Dashboard</Link><Link className="adminBack" href="/about">View About Page</Link></div>
      </div>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">{editingId ? "Update profile" : "New profile"}</div><h2>{editingId ? "Edit team member" : "Add team member"}</h2></div></div>
        <form onSubmit={save}>
          <div className="adminFormGrid">
            <label>Full name<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Designation / role<input required maxLength={180} value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Reporting Intern" /></label>
          </div>
          <div className="adminFormGrid">
            <label>Department / team category<select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>{["Editorial","Reporting","Photography","Video","Interns","Administration","Contributors","Other"].map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Display order<input type="number" min="0" step="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /><small>Lower numbers appear first.</small></label>
          </div>
          <label>Professional biography<textarea required rows={5} maxLength={2500} value={form.biography} onChange={e => setForm({ ...form, biography: e.target.value })} /></label>
          <label>Tagline (optional)<input maxLength={180} value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} /></label>
          <label>Profile photograph<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={photoBusy || busy} /><small>JPEG, PNG or WebP · maximum 5 MB</small></label>
          {form.image_url && <div className="adminImagePreview"><img src={form.image_url} alt="Team profile preview" /><button type="button" onClick={() => setForm({ ...form, image_url: "" })}>Remove photograph</button></div>}
          <label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Show this profile on the public About page</label>
          {message && <p className="adminMessage" role="status">{message}</p>}
          <div className="adminActions"><button type="submit" disabled={busy || photoBusy}>{busy ? "Saving…" : editingId ? "Save Changes" : "Add Team Member"}</button>{editingId && <button type="button" disabled={busy} onClick={reset}>Cancel</button>}</div>
        </form>
      </section>

      <section className="adminEditor">
        <div className="adminEditorHead"><div><div className="adminLabel">Current records</div><h2>Team directory</h2></div><span className="adminStatus">{members.length} profiles</span></div>
        <div className="adminStoryList">
          {members.map(member => <article className="adminStoryRow" key={member.id}>
            <div>{member.image_url && <img src={member.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, float: "left", marginRight: 14 }} />}<span className="adminStatus">{member.is_active ? "visible" : "hidden"}</span><h3>{member.name}</h3><p>{member.designation} · {member.department} · Order {member.sort_order}</p></div>
            <div className="adminActions"><button type="button" disabled={busy} onClick={() => edit(member)}>Edit</button><button type="button" disabled={busy} onClick={() => void remove(member)}>Delete</button></div>
          </article>)}
          {members.length === 0 && <p className="adminNote">No team records found.</p>}
        </div>
      </section>
    </main>
  );
}
