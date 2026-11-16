"use client";
import { FormEvent,useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export default function ForgotPasswordPage(){
 const [email,setEmail]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage("");setError("");try{const result=await authClient.requestPasswordReset({email:email.trim(),redirectTo:window.location.origin+"/auth/reset-password"});if(result.error)setError(result.error.message||"Password recovery could not be requested.");else setMessage("If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.");}catch{setError("Password recovery could not be requested. Please try again.");}finally{setBusy(false);}}
 return <main className="adminLogin"><div className="adminLoginCard"><div className="kicker">Dweep Tulika Newsroom</div><h1>Reset password</h1><p>Enter your newsroom account email and we’ll send a secure recovery link.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{error&&<p className="adminError" role="alert">{error}</p>}{message&&<p className="adminMessage" role="status">{message}</p>}<button disabled={busy}>{busy?"Sending…":"Send recovery email"}</button></form><Link href="/admin/login">Back to editorial login</Link></div></main>;
}
