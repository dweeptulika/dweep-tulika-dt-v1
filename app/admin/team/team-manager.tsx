"use client";
import { FormEvent,useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
type Member={id:string;name:string;designation:string;department:string;biography:string;tagline:string|null;image_url:string|null;sort_order:number;is_active:boolean};
const blank={name:"",designation:"",department:"Editorial",biography:"",tagline:"",image_url:"",sort_order:"100",is_active:true};
export default function TeamManager(){
 const router=useRouter();const supabase=useMemo(()=>createClient(),[]);const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[members,setMembers]=useState<Member[]>([]);
 const [form,setForm]=useState(blank),[editing,setEditing]=useState<string|null>(null),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function load(){const r=await fetch("/api/admin/team-members",{cache:"no-store"}),j=await r.json();if(!r.ok)throw new Error(j.error||"Could not load team profiles.");setMembers(Array.isArray(j)?j:[]);}
 useEffect(()=>{supabase.auth.getSession().then(async({data})=>{if(!data?.session){router.replace("/admin/login");return;}try{await load();setReady(true);}catch(e){setError(e instanceof Error?e.message:"Could not load team profiles.");setReady(true);}}).catch(()=>router.replace("/admin/login"));},[router,supabase]);
 function reset(){setEditing(null);setForm(blank);setMessage("");setError("");}
 function edit(m:Member){setEditing(m.id);setForm({name:m.name,designation:m.designation,department:m.department,biography:m.biography,tagline:m.tagline||"",image_url:m.image_url||"",sort_order:String(m.sort_order),is_active:m.is_active});setMessage("Editing team profile.");window.scrollTo({top:0,behavior:"smooth"});}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");setError("");try{const payload={...form,sort_order:Number(form.sort_order),tagline:form.tagline||null,image_url:form.image_url||null};const r=await fetch(editing?"/api/admin/team-members/"+editing:"/api/admin/team-members",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),j=await r.json();if(!r.ok)throw new Error(j.error||"Could not save team profile.");setMessage(editing?"Team profile updated.":"Team member added.");reset();await load();}catch(e){setError(e instanceof Error?e.message:"Could not save team profile.");}finally{setBusy(false);}}
 async function remove(m:Member){if(!window.confirm("Delete the profile for "+m.name+"?"))return;setBusy(true);setError("");try{const r=await fetch("/api/admin/team-members/"+m.id,{method:"DELETE"}),j=await r.json();if(!r.ok)throw new Error(j.error||"Could not delete team profile.");setMessage("Team profile deleted.");await load();}catch(e){setError(e instanceof Error?e.message:"Could not delete team profile.");}finally{setBusy(false);}}
 if(!ready)return <main className="adminLogin"><p>Checking administrator access…</p></main>;
 return <main className="adminShell">
  <div className="adminTop"><div><div className="kicker">Dweep Tulika Newsroom</div><h1>Manage Editorial Team</h1><p>Manage the profiles displayed on the public About page.</p></div><div className="adminHeaderActions"><Link className="adminBack" href="/admin">Back to dashboard</Link><Link className="adminBack" href="/">View Website</Link></div></div>
  <section className="adminEditor"><div className="adminEditorHead"><div><div className="adminLabel">{editing?"Edit profile":"New profile"}</div><h2>{editing?"Update team member":"Add team member"}</h2></div></div>
   <form onSubmit={save}>
    <div className="adminFormGrid"><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Designation<input required value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})}/></label></div>
    <div className="adminFormGrid"><label>Department<input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></label><label>Display order<input type="number" min="0" step="1" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})}/></label></div>
    <label>Professional biography<textarea required rows={5} maxLength={2500} value={form.biography} onChange={e=>setForm({...form,biography:e.target.value})}/></label>
    <label>Tagline (optional)<input maxLength={180} value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})}/></label>
    <label>Profile photograph URL<input type="url" value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://media.dweeptulika.in/..."/><small>R2 upload is being connected separately; paste an existing public image URL for now.</small></label>
    {form.image_url&&<div className="adminImagePreview"><img src={form.image_url} alt="Team profile preview"/><button type="button" onClick={()=>setForm({...form,image_url:""})}>Remove photograph</button></div>}
    <label><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> Show this profile on the public About page</label>
    {message&&<p className="adminMessage" role="status">{message}</p>}{error&&<p className="adminMessage" role="alert">{error}</p>}
    <div className="adminActions"><button type="submit" disabled={busy}>{busy?"Saving…":editing?"Save Changes":"Add Team Member"}</button>{editing&&<button type="button" disabled={busy} onClick={reset}>Cancel</button>}</div>
   </form>
  </section>
  <section className="adminEditor"><div className="adminEditorHead"><div><div className="adminLabel">Current records</div><h2>Team directory</h2></div><span className="adminStatus">{members.length} profiles</span></div>
   <div className="adminStoryList">{members.map(m=><article className="adminStoryRow" key={m.id}><div>{m.image_url&&<img src={m.image_url} alt="" style={{width:56,height:56,objectFit:"cover",borderRadius:8,float:"left",marginRight:14}}/>}<span className="adminStatus">{m.is_active?"visible":"hidden"}</span><h3>{m.name}</h3><p>{m.designation} · {m.department} · Order {m.sort_order}</p></div><div className="adminActions"><button type="button" disabled={busy} onClick={()=>edit(m)}>Edit</button><button type="button" disabled={busy} onClick={()=>void remove(m)}>Delete</button></div></article>)}{!members.length&&<p className="adminNote">No team profiles found.</p>}</div>
  </section>
 </main>;
}
