"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace("/admin");
    router.refresh();
  }

  return <main className="adminLogin">
    <div className="adminLoginCard">
      <div className="kicker">Dweep Tulika Newsroom</div>
      <h1>Editorial Login</h1>
      <p>Sign in to manage drafts and publish reports.</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {error && <p className="adminError">{error}</p>}
        <button disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button>
      </form>
      <Link href="/">Return to website</Link>
    </div>
  </main>;
}
