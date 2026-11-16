"use client";
import { FormEvent,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export default function ResetPasswordPage(){
 const router=useRouter();const [token,setToken]=useState("");useEffect(()=>{setToken(new URLSearchParams(window.location.search).get("token")||"");},[]);
 const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [message,setMessage]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");setMessage("");if(!token){setError("This password-reset link is invalid or incomplete. Request a new one.");return;}if(password.length<8){setError("Choose a password with at least 8 characters.");return;}if(password!==confirm){setError("The passwords do not match.");return;}setBusy(true);try{const result=await authClient.resetPassword({newPassword:password,token});if(result.error)setError(result.error.message||"Password could not be reset.");else{setMessage("Password updated. You can now sign in.");setTimeout(()=>router.replace("/admin/login"),1200);}}catch{setError("Password could not be reset. Request a fresh recovery link and try again.");}finally{setBusy(false);}}
 return <main className="adminLogin"><div className="adminLoginCard"><div className="kicker">Dweep Tulika Newsroom</div><h1>Choose a new password</h1><form onSubmit={submit}><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>{error&&<p className="adminError" role="alert">{error}</p>}{message&&<p className="adminMessage" role="status">{message}</p>}<button disabled={busy}>{busy?"Updating…":"Update password"}</button></form><Link href="/admin/login">Back to editorial login</Link></div></main>;
}
