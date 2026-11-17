export type BackendProvider = "supabase" | "alternative";

/**
 * Reads the server-side provider selection.
 *
 * Supabase remains the default so existing deployments are unchanged.
 * The alternative provider is intentionally rejected until its adapter,
 * credentials, and integration tests have been implemented.
 */
export function getBackendProvider(
  configuredProvider: string | undefined = process.env.BACKEND_PROVIDER,
): BackendProvider {
  const provider = configuredProvider?.trim().toLowerCase() || "supabase";

  if (provider === "supabase") return "supabase";
  if (provider === "alternative") return "alternative";

  throw new Error(
    `Unsupported BACKEND_PROVIDER "${provider}". Expected "supabase" or "alternative".`,
  );
}

/**
 * Prevents a configuration-only switch from being mistaken for a real
 * migration. Call this from backend construction code before using a provider.
 */
export function assertBackendProviderImplemented(
  provider: BackendProvider,
): void {
  if (provider === "alternative") {
    throw new Error(
      "The alternative backend is not implemented yet. Keep BACKEND_PROVIDER=supabase.",
    );
  }
}
