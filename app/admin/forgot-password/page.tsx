"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      // Use the same @supabase/ssr browser client as the rest of the app.
      // Its PKCE verifier is stored using the app's cookie-based auth flow,
      // which the server callback can read.
      const supabase = createClient();
      const redirectTo = new URL(
        "/auth/callback?next=%2Fauth%2Freset-password",
        window.location.origin,
      ).toString();
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (requestError) {
        setError(`Recovery email failed: ${requestError.message}`);
      } else {
        setMessage("If an account exists for that email, a password-recovery link has been sent. Check your inbox and spam folder.");
      }
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? `Recovery email could not be requested: ${cause.message}`
          : "Recovery email could not be requested because of an unexpected error.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adminLogin">
      <div className="adminLoginCard">
        <div className="kicker">Dweep Tulika Newsroom</div>
        <h1>Reset password</h1>
        <p>Enter your newsroom account email and we’ll send a secure recovery link.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {error && <p className="adminError" role="alert">{error}</p>}
          {message && <p className="adminMessage" role="status">{message}</p>}
          <button disabled={busy}>{busy ? "Sending…" : "Send recovery email"}</button>
        </form>
        <Link href="/admin/login">Back to editorial login</Link>
      </div>
    </main>
  );
}
