import { createHash } from "node:crypto";
import { Pool } from "pg";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

type MediaRow = {
  id: string;
  file_path: string;
  public_url: string;
};

const apply = process.argv.includes("--apply");
const testSource = process.argv.includes("--test-source");
const allowedBranch = "migration/reversible-backend-adapter";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function publicUrl(base: string, key: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${normalizedBase}/${encodedKey}`;
}

function createSupabaseS3Client(): S3Client {
  return new S3Client({
    region: required("SUPABASE_S3_REGION"),
    endpoint: required("SUPABASE_S3_ENDPOINT"),
    credentials: {
      accessKeyId: required("SUPABASE_S3_ACCESS_KEY_ID"),
      secretAccessKey: required("SUPABASE_S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });
}

async function downloadFromSupabase(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Supabase S3 returned no body for ${key}`);
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  if (!bytes.length) throw new Error(`Supabase S3 returned an empty object for ${key}`);
  return {
    bytes,
    contentType: response.ContentType || "application/octet-stream",
  };
}

async function main() {
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REF_NAME !== allowedBranch) {
    throw new Error(`This migration may only run from ${allowedBranch}.`);
  }

  const databaseUrl = required("NEON_MIGRATION_DATABASE_URL");
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10_000 });
  try {
    const { rows } = await pool.query<MediaRow>(
      "select id, file_path, public_url from public.media order by file_path",
    );
    if (!rows.length) throw new Error("No media records found; refusing to continue.");

    console.log(`Found ${rows.length} media records in Neon.`);

    if (testSource) {
      const source = createSupabaseS3Client();
      const bucket = required("SUPABASE_S3_BUCKET");
      const sample = rows[0];
      const downloaded = await downloadFromSupabase(source, bucket, sample.file_path);
      console.log(`SOURCE TEST SUCCESS: downloaded ${sample.file_path} from Supabase S3 (${downloaded.bytes.length} bytes; ${downloaded.contentType}).`);
      console.log("No R2 objects were uploaded and no database URLs were changed.");
      return;
    }

    if (!apply) {
      console.log("DRY RUN: no files uploaded and no database URLs changed.");
      console.log("Run with test_source=true first; only use apply=true after the source test succeeds.");
      return;
    }

    const source = createSupabaseS3Client();
    const sourceBucket = required("SUPABASE_S3_BUCKET");
    const accountId = required("R2_ACCOUNT_ID");
    const accessKeyId = required("R2_ACCESS_KEY_ID");
    const secretAccessKey = required("R2_SECRET_ACCESS_KEY");
    const bucket = required("R2_BUCKET_NAME");
    const base = required("R2_PUBLIC_BASE_URL");
    if (!base.startsWith("https://")) throw new Error("R2_PUBLIC_BASE_URL must use HTTPS.");

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    const verified: Array<{ row: MediaRow; url: string; bytes: number; sha256: string }> = [];
    const concurrency = 4;
    for (let i = 0; i < rows.length; i += concurrency) {
      const batch = rows.slice(i, i + concurrency);
      const outcomes = await Promise.all(batch.map(async (row) => {
        const downloadedSource = await downloadFromSupabase(source, sourceBucket, row.file_path);
        const { bytes, contentType } = downloadedSource;
        const sha256 = createHash("sha256").update(bytes).digest("base64");
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: row.file_path,
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }));
        const head = await s3.send(new HeadObjectCommand({
          Bucket: bucket,
          Key: row.file_path,
          ChecksumMode: "ENABLED",
        }));
        if (head.ContentLength !== bytes.length) {
          throw new Error(`R2 size verification failed for ${row.file_path}`);
        }
        const downloaded = await s3.send(new GetObjectCommand({
          Bucket: bucket,
          Key: row.file_path,
        }));
        if (!downloaded.Body) throw new Error(`R2 read-back returned no body for ${row.file_path}`);
        const readBack = Buffer.from(await downloaded.Body.transformToByteArray());
        const readBackHash = createHash("sha256").update(readBack).digest("base64");
        if (readBack.length !== bytes.length || readBackHash !== sha256) {
          throw new Error(`R2 read-back checksum verification failed for ${row.file_path}`);
        }
        return { row, url: publicUrl(base, row.file_path), bytes: bytes.length, sha256 };
      }));
      for (const item of outcomes) {
        verified.push(item);
        console.log(`Verified ${verified.length}/${rows.length}: ${item.row.file_path} (${item.bytes} bytes)`);
      }
    }

    if (verified.length !== rows.length) throw new Error("Not every object passed R2 verification; database URLs were not changed.");

    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const item of verified) {
        const oldUrl = item.row.public_url;
        const newUrl = item.url;
        await client.query(
          "update public.media set public_url = $1 where id = $2",
          [newUrl, item.row.id],
        );
        await client.query(
          `update public.articles
             set featured_image = replace(featured_image, $1, $2),
                 social_image = replace(social_image, $1, $2),
                 body_html = replace(body_html, $1, $2)
           where featured_image like '%' || $1 || '%'
              or social_image like '%' || $1 || '%'
              or body_html like '%' || $1 || '%'`,
          [oldUrl, newUrl],
        );
        await client.query(
          "update public.advertisements set image_url = replace(image_url, $1, $2) where image_url like '%' || $1 || '%'",
          [oldUrl, newUrl],
        );
        await client.query(
          "update public.team_members set image_url = replace(image_url, $1, $2) where image_url like '%' || $1 || '%'",
          [oldUrl, newUrl],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    console.log(`SUCCESS: uploaded and verified ${verified.length} R2 objects; updated media and all matching article, ad, and team image URLs.`);
    console.log("Supabase source objects were not deleted. Rollback remains possible while the source bucket is retained.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("R2 media migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
