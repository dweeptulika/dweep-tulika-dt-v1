import { setNewsroomPassword } from "./actions";

export const metadata = {
  title: "Temporary newsroom account recovery",
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  not_configured: "Recovery is not configured. Set the required server-side environment variables in Vercel.",
  unauthorized: "The recovery secret was not accepted.",
  invalid_password: "Use a password of at least 12 characters and make both password fields match.",
  failed: "The password update failed. Check server logs; the password was not confirmed changed.",
  success: "Password updated. Sign in to the newsroom, then remove this temporary recovery page and its environment secret immediately.",
};

export default async function RecoveryAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <main style={{ maxWidth: 520, margin: "60px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Temporary newsroom recovery</h1>
      <p>This restricted tool changes the password for the existing newsroom account. Never share the recovery secret.</p>
      {status && <p role="status">{messages[status] ?? "Unknown status."}</p>}
      <form action={setNewsroomPassword} style={{ display: "grid", gap: 14 }}>
        <label>Recovery secret<input name="recoverySecret" type="password" autoComplete="off" required style={{ display: "block", width: "100%", padding: 10 }} /></label>
        <label>New password (12+ characters)<input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required style={{ display: "block", width: "100%", padding: 10 }} /></label>
        <label>Confirm new password<input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required style={{ display: "block", width: "100%", padding: 10 }} /></label>
        <button type="submit" style={{ padding: 12 }}>Set newsroom password</button>
      </form>
    </main>
  );
}
