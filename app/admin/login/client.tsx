"use client";
import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export default function AdminLoginPage(){
 const router=useRouter();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{const result=await authClient.signIn.email({email:email.trim(),password});if(result.error){setError(result.error.message||"Sign-in failed. Check your credentials and try again.");setBusy(false);return;}router.replace("/admin");router.refresh();}catch{setError("The sign-in service could not be reached. Please try again.");setBusy(false);}}
 return <main className="adminLogin"><div className="adminLoginCard"><div className="kicker">Dweep Tulika Newsroom</div><h1>Editorial Login</h1><p>Sign in to manage drafts and publish reports.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="adminError" role="alert">{error}</p>}<button disabled={busy}>{busy?"Signing in…":"Sign In"}</button></form><Link href="/admin/forgot-password">Forgot password?</Link><Link href="/">Return to website</Link></div></main>;
}
