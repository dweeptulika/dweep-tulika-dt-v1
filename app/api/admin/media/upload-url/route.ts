import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireEditor } from "@/lib/auth/authorization";
import {
  createR2Client,
  getNewsroomUploadPrefix,
  getR2Config,
  makeR2PublicUrl,
  MAX_NEWSROOM_IMAGE_BYTES,
  NEWSROOM_IMAGE_TYPES,
  type NewsroomImageType,
} from "@/lib/media/r2";

export const runtime = "nodejs";

type UploadRequest = {
  fileName?: string;
  contentType?: string;
  size?: number;
};

function safeFileBase(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "image";
}

export async function POST(request: NextRequest) {
  const { response } = await requireEditor();
  if (response) return response;

  let input: UploadRequest;
  try {
    input = await request.json() as UploadRequest;
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const contentType = input.contentType as NewsroomImageType;
  if (!Object.prototype.hasOwnProperty.call(NEWSROOM_IMAGE_TYPES, contentType)) {
    return NextResponse.json({ error: "Only JPEG, PNG and WebP images are allowed." }, { status: 400 });
  }
  if (!Number.isInteger(input.size) || !input.size || input.size < 1 || input.size > MAX_NEWSROOM_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be between 1 byte and 10 MB." }, { status: 400 });
  }
  if (typeof input.fileName !== "string" || !input.fileName.trim()) {
    return NextResponse.json({ error: "Image filename is required." }, { status: 400 });
  }

  try {
    const config = getR2Config();
    const extension = NEWSROOM_IMAGE_TYPES[contentType];
    const filePath = `${getNewsroomUploadPrefix()}${Date.now()}-${randomUUID()}-${safeFileBase(input.fileName)}.${extension}`;
    const cacheControl = "public, max-age=31536000, immutable";
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: filePath,
      ContentType: contentType,
      CacheControl: cacheControl,
    });
    const uploadUrl = await getSignedUrl(createR2Client(config), command, { expiresIn: 300 });

    return NextResponse.json({
      uploadUrl,
      filePath,
      publicUrl: makeR2PublicUrl(config.publicBaseUrl, filePath),
      headers: { "Content-Type": contentType, "Cache-Control": cacheControl },
      expiresIn: 300,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "R2_UPLOAD_NOT_CONFIGURED") {
      return NextResponse.json({
        error: "Image uploads are not configured on this deployment yet. The newsroom administrator must add the R2 upload credentials.",
      }, { status: 503 });
    }
    console.error("Could not create newsroom R2 upload URL", error);
    return NextResponse.json({ error: "Could not prepare the image upload. Please try again." }, { status: 500 });
  }
}
