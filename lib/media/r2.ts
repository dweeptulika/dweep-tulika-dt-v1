import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

export const MAX_NEWSROOM_IMAGE_BYTES = 10 * 1024 * 1024;
export const NEWSROOM_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type NewsroomImageType = keyof typeof NEWSROOM_IMAGE_TYPES;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicBaseUrl: string;
};

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicBaseUrl) {
    throw new Error("R2_UPLOAD_NOT_CONFIGURED");
  }
  if (!/^https:\/\//i.test(publicBaseUrl)) {
    throw new Error("R2_PUBLIC_BASE_URL must use HTTPS.");
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicBaseUrl };
}

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export function getNewsroomUploadPrefix(): string {
  return process.env.VERCEL_ENV === "preview" ? "preview/articles/" : "articles/";
}

export function makeR2PublicUrl(baseUrl: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/+$/, "")}/${encodedKey}`;
}

export function hasValidImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (type === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
