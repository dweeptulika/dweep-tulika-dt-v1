"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await authClient.emailOtp.requestPasswordReset({
        email: email.trim(),
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Password-reset OTP request failed", result.error);
        setError(result.error.message || "Password recovery could not be requested.");
        return;
      }
      setCodeSent(true);
      setMessage("If this newsroom account exists, a password-reset code has been sent. Check your inbox and spam folder.");
    } catch (cause) {
      console.error("[Dweep Tulika auth] Password-reset OTP request threw an exception", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCode();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      setBusy(false);
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password,
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Password reset failed", result.error);
        setError(result.error.message || "Password could not be reset. Request a new code and try again.");
        return;
      }
      setMessage("Password updated successfully. Return to editorial login and sign in with your new password.");
      setCodeSent(false);
      setOtp("");
      setPassword("");
      setConfirm("");
    } catch (cause) {
      console.error("[Dweep Tulika auth] Password reset request threw an exception", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adminLogin">
      <div className="adminLoginCard">
        <div className="kicker">Dweep Tulika Newsroom</div>
        <h1>Reset password</h1>
        <p>Verify your newsroom email address with a one-time code, then choose a new password.</p>
        {!codeSent ? (
          <form onSubmit={requestCode}>
            <label>
              Email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {error && <p className="adminError" role="alert">{error}</p>}
            {message && <p className="adminMessage" role="status">{message}</p>}
            <button disabled={busy}>{busy ? "Sending…" : "Send reset code"}</button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label>
              Email
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Reset code
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\\D/g, "").slice(0, 6))} />
            </label>
            <label>
              New password
              <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label>
              Confirm new password
              <input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </label>
            {error && <p className="adminError" role="alert">{error}</p>}
            {message && <p className="adminMessage" role="status">{message}</p>}
            <button disabled={busy || otp.length !== 6}>{busy ? "Updating…" : "Update password"}</button>
            <button type="button" disabled={busy} onClick={sendCode}>Resend code</button>
          </form>
        )}
        <Link href="/admin/login">Back to editorial login</Link>
      </div>
    </main>
  );
}
