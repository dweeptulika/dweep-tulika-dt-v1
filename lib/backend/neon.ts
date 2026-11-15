import "server-only";

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when CONTENT_DATABASE_PROVIDER=neon.");
  }

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle Neon PostgreSQL client error", error);
  });

  return pool;
}

/**
 * Executes a parameterized query using the server-only Neon connection.
 * Never expose DATABASE_URL to browser code or NEXT_PUBLIC_* variables.
 */
export async function queryNeon<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, [...values]);
  return result.rows;
}

export function isNeonContentDatabase(): boolean {
  const provider = process.env.CONTENT_DATABASE_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "supabase") return false;
  if (provider === "neon") return true;
  throw new Error(
    `Unsupported CONTENT_DATABASE_PROVIDER "${provider}". Expected "supabase" or "neon".`,
  );
}
