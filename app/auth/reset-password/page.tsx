"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      const supabase = createClient();
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryType = hashParams.get("type");

      // Some Supabase email templates use the implicit token flow and return
      // the session in the URL fragment. Explicitly establish that session
      // before allowing a password update.
      if (accessToken && refreshToken && (!recoveryType || recoveryType === "recovery")) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + window.location.search,
        );
        if (sessionError) {
          setError(`Recovery session could not be established: ${sessionError.message}`);
          setSessionReady(false);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setError(`Could not check the recovery session: ${sessionError.message}`);
        setSessionReady(false);
        return;
      }
      if (!data.session) {
        setError(
          "No active recovery session was found. Open the newest recovery email link in the same browser where you requested it. If the link has already been used or this message persists, contact the site administrator before requesting another email.",
        );
        setSessionReady(false);
        return;
      }

      setError("");
      setSessionReady(true);
    }

    void prepareRecoverySession().catch((cause: unknown) => {
      if (cancelled) return;
      setError(
        cause instanceof Error
          ? `Could not prepare the recovery session: ${cause.message}`
          : "Could not prepare the recovery session. Please contact the site administrator.",
      );
      setSessionReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setError(
          sessionError
            ? `Recovery session check failed: ${sessionError.message}`
            : "No active recovery session was found. Open the newest recovery email link in this browser before updating the password.",
        );
        setSessionReady(false);
        setBusy(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(`Password update failed: ${updateError.message}`);
        setBusy(false);
        return;
      }

      router.replace("/admin/login?reset=success");
      router.refresh();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? `Password update could not be completed: ${cause.message}`
          : "A connection problem prevented the password update. Please try again once. If it continues, contact the site administrator rather than requesting another recovery email.",
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
          <button disabled={busy || !sessionReady}>{busy ? "Updating…" : "Update password"}</button>
        </form>
        <Link href="/admin/login">Back to editorial login</Link>
      </div>
    </main>
  );
}
