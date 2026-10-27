"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import type { Session } from "@supabase/supabase-js";

function recoveryFailureMessage(detail?: string) {
  const normalized = (detail ?? "").toLowerCase();

  if (
    normalized.includes("code verifier") ||
    normalized.includes("verifier") ||
    normalized.includes("pkce")
  ) {
    return "This browser could not find the secure verification data for the recovery link. Open the newest recovery email in the same browser profile where you requested it. If you already did that, contact the site administrator; do not keep requesting new links.";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("already") ||
    normalized.includes("invalid")
  ) {
    return "This recovery link is expired, invalid, or has already been used. Contact the site administrator before requesting another email.";
  }

  return "We couldn't verify this recovery link. Please keep this page open and contact the site administrator with the diagnostic detail below; don't repeatedly request new emails.";
}

export default function AuthCompletePage() {
  const [message, setMessage] = useState("Verifying your secure recovery link…");
  const [diagnostic, setDiagnostic] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      const requestedNext = params.get("next") ?? "/admin/login";
      const next =
        requestedNext.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/admin/login";

      // Remove the one-time code from the address bar/history immediately.
      window.history.replaceState(window.history.state, "", window.location.pathname);

      const recovery = createRecoveryClient();
      let error: { message: string } | null = null;
      let session: Session | null = null;

      if (code) {
        const result = await recovery.auth.exchangeCodeForSession(code);
        error = result.error;
        session = result.data.session;
      } else if (tokenHash && type === "recovery") {
        const result = await recovery.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        error = result.error;
        session = result.data.session;
      } else {
        error = { message: "Recovery URL is missing code or recovery token parameters." };
      }

      if (cancelled) return;

      if (error) {
        setMessage(recoveryFailureMessage(error.message));
        // SDK error messages describe the failure category and do not contain
        // the recovery URL or its token. Never render query parameters.
        setDiagnostic(error.message);
        return;
      }

      if (!session) {
        const { data, error: sessionError } = await recovery.auth.getSession();
        if (cancelled) return;
        if (sessionError || !data.session) {
          const detail = sessionError?.message ?? "Code exchange completed without an active recovery session.";
          setMessage("The recovery link was processed, but this browser could not establish a session for the password update. Keep this page open and contact the site administrator with the technical diagnostic; do not repeatedly request new emails.");
          setDiagnostic(detail);
          return;
        }
        session = data.session;
      }

      // Transfer the verified session from the dedicated PKCE client into the
      // application's cookie-backed SSR client before opening the reset form.
      const appClient = createClient();
      const { error: transferError } = await appClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (cancelled) return;

      if (transferError) {
        setMessage("The recovery link was verified, but the newsroom session could not be saved for the password update. Keep this page open and contact the site administrator.");
        setDiagnostic(transferError.message);
        return;
      }

      const { data: appSessionData, error: appSessionError } = await appClient.auth.getSession();
      if (cancelled) return;
      if (appSessionError || !appSessionData.session) {
        const detail = appSessionError?.message ?? "Session transfer completed but no cookie-backed session was found.";
        setMessage("The recovery link was verified, but this browser could not establish the newsroom session for the password update. Keep this page open and contact the site administrator.");
        setDiagnostic(detail);
        return;
      }

      // Do not leave a second, temporary recovery session in localStorage.
      await recovery.auth.signOut({ scope: "local" });
      if (cancelled) return;

      window.location.replace(next);
    }

    void completeAuth().catch((cause: unknown) => {
      if (cancelled) return;
      const detail =
        cause instanceof Error ? cause.message : "Unknown error during recovery verification";
      setMessage(recoveryFailureMessage(detail));
      setDiagnostic(detail);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="adminLogin">
      <div className="adminLoginCard">
        <div className="kicker">Dweep Tulika Newsroom</div>
        <h1>Verifying recovery link</h1>
        <p role="status">{message}</p>
        {diagnostic && (
          <details>
            <summary>Technical diagnostic</summary>
            <p role="note">{diagnostic}</p>
            <p>Do not share the full recovery URL or its code/token.</p>
          </details>
        )}
      </div>
    </main>
  );
}
