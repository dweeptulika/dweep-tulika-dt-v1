"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          "We couldn't update the password from this link. It may have expired or already been used. Please contact the site administrator so the recovery setup can be checked; don't keep requesting new emails.",
        );
        setBusy(false);
        return;
      }

      router.replace("/admin/login?reset=success");
      router.refresh();
    } catch {
      setError(
        "A connection problem prevented the password update. Please try again once. If it continues, contact the site administrator rather than requesting another recovery email.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="adminLogin">
      <div className="adminLoginCard">
        <div className="kicker">Dweep Tulika Newsroom</div>
        <h1>Choose a password</h1>
        <p>Set a new password for your newsroom account.</p>
        <form onSubmit={submit}>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error && <p className="adminError" role="alert">{error}</p>}
          <button disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        </form>
        <Link href="/admin/login">Back to editorial login</Link>
      </div>
    </main>
  );
}
