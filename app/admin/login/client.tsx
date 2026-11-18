"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [otpLoginRequested, setOtpLoginRequested] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  function isVerificationError(value: unknown) {
    const message =
      typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as { message?: unknown }).message ?? "")
          : "";
    const code =
      value && typeof value === "object" && "code" in value
        ? String((value as { code?: unknown }).code ?? "")
        : "";
    return /verification required|email not verified|email.*not.*verified/i.test(
      message + " " + code,
    );
  }

  async function sendVerificationCode() {
    const address = email.trim();
    if (!address) {
      setError("Enter your newsroom email address first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: address,
        type: "email-verification",
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Could not send verification OTP", result.error);
        setError(result.error.message || "The verification code could not be sent.");
        return;
      }
      setVerificationRequired(true);
      setVerified(false);
      setNotice("A verification code has been requested. Check your inbox and spam folder.");
    } catch (cause) {
      console.error("[Dweep Tulika auth] Verification OTP request failed", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function sendSignInCode() {
    const address = email.trim();
    if (!address) {
      setError("Enter your newsroom email address first.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: address,
        type: "sign-in",
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Passwordless sign-in OTP request failed", result.error);
        setError(result.error.message || "A sign-in code could not be sent.");
        return;
      }
      setOtpLoginRequested(true);
      setVerificationRequired(false);
      setOtp("");
      setNotice("A one-time sign-in code has been sent. Check your newsroom inbox and spam folder.");
    } catch (cause) {
      console.error("[Dweep Tulika auth] Passwordless sign-in OTP request threw an exception", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Sign-in returned an API error", result.error);
        if (isVerificationError(result.error)) {
          await sendVerificationCode();
          return;
        }
        setError(result.error.message || "Sign-in failed. Check your credentials and try again.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      console.error("[Dweep Tulika auth] Sign-in request threw an exception", cause);
      if (isVerificationError(cause)) {
        await sendVerificationCode();
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifySignInCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Passwordless sign-in verification failed", result.error);
        setError(result.error.message || "That sign-in code could not be verified. Request a new code and try again.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      console.error("[Dweep Tulika auth] Passwordless sign-in verification threw an exception", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (result.error) {
        console.error("[Dweep Tulika auth] Email verification failed", result.error);
        setError(result.error.message || "That code could not be verified. Request a new code and try again.");
        return;
      }
      setVerified(true);
      setVerificationRequired(false);
      setNotice("Email verified successfully. You can now sign in. If your password is not accepted, use the password-reset link below.");
      const signIn = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (!signIn.error) {
        router.replace("/admin");
        router.refresh();
      } else {
        console.info("[Dweep Tulika auth] Email verified; password sign-in still requires recovery", signIn.error);
      }
    } catch (cause) {
      console.error("[Dweep Tulika auth] Email verification request failed", cause);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adminLogin">
      <div className="adminLoginCard">
        <div className="kicker">Dweep Tulika Newsroom</div>
        <h1>Editorial Login</h1>
        <p>Sign in to manage drafts and publish reports.</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {!otpLoginRequested && error && <p className="adminError" role="alert">{error}</p>}
          {!otpLoginRequested && notice && <p className="adminMessage" role="status">{notice}</p>}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : "Sign In"}</button>
        </form>

        {!otpLoginRequested && (
          <button className="adminLoginOtpButton" type="button" disabled={busy} onClick={sendSignInCode}>
            Sign in with an email code instead
          </button>
        )}

        {otpLoginRequested && (
          <form onSubmit={verifySignInCode}>
            <p>{notice}</p>
            <label>
              Email sign-in code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            {error && <p className="adminError" role="alert">{error}</p>}
            <button disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify and sign in"}</button>
            <button type="button" disabled={busy} onClick={sendSignInCode}>Resend code</button>
            <button type="button" disabled={busy} onClick={() => { setOtpLoginRequested(false); setOtp(""); setError(""); setNotice(""); }}>Back to password sign-in</button>
          </form>
        )}

        {verificationRequired && (
          <form onSubmit={verifyEmail}>
            <p>Verify your newsroom email address to continue.</p>
            <label>
              Email verification code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <button disabled={busy || otp.length !== 6}>{busy ? "Verifying…" : "Verify email"}</button>
            <button type="button" disabled={busy} onClick={sendVerificationCode}>Resend code</button>
          </form>
        )}

        {verified && (
          <p className="adminMessage" role="status">
            Email verification is complete. If the saved password is missing or no longer valid, <Link href="/admin/forgot-password">reset your password here</Link>.
          </p>
        )}

        <Link href="/admin/forgot-password">Forgot password?</Link>
        <Link href="/">Return to website</Link>
      </div>
    </main>
  );
}
