"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCompletePage() {
  const [message, setMessage] = useState("Verifying your secure recovery link…");

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

      const supabase = createClient();
      let error: { message: string } | null = null;

      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (tokenHash && type === "recovery") {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        error = result.error;
      } else {
        error = { message: "The recovery link is missing required parameters." };
      }

      if (cancelled) return;

      if (error) {
        setMessage(
          "This recovery link could not be verified or has expired. Return to Editorial Login and contact the site administrator before requesting another email.",
        );
        return;
      }

      window.location.replace(next);
    }

    void completeAuth().catch(() => {
      if (!cancelled) {
        setMessage(
          "We couldn't verify this link. Return to Editorial Login and contact the site administrator.",
        );
      }
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
      </div>
    </main>
  );
}
