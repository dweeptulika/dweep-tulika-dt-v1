import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { requireEditor } from "@/lib/auth/authorization";
import { queryNeon } from "@/lib/backend/neon";
import {
  createR2Client,
  getNewsroomUploadPrefix,
  getR2Config,
  hasValidImageSignature,
  MAX_NEWSROOM_IMAGE_BYTES,
  NEWSROOM_IMAGE_TYPES,
  type NewsroomImageType,
} from "@/lib/media/r2";

export const runtime = "nodejs";

type CompleteRequest = {
  filePath?: string;
  altText?: string;
};

export async function POST(request: NextRequest) {
  const { actor, response } = await requireEditor();
  if (response || !actor) return response;

  let input: CompleteRequest;
  try {
    input = await request.json() as CompleteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid upload confirmation." }, { status: 400 });
  }

  const filePath = typeof input.filePath === "string" ? input.filePath : "";
  const expectedPrefix = getNewsroomUploadPrefix();
  if (!filePath.startsWith(expectedPrefix) || filePath.includes("..") || filePath.includes("\\") || filePath.includes("?")) {
    return NextResponse.json({ error: "Invalid newsroom image path." }, { status: 400 });
  }
  const altText = typeof input.altText === "string" ? input.altText.trim().slice(0, 500) : "";

  let config: ReturnType<typeof getR2Config>;
  try {
    config = getR2Config();
  } catch (error) {
    if (error instanceof Error && error.message === "R2_UPLOAD_NOT_CONFIGURED") {
      return NextResponse.json({ error: "R2 image storage is not configured on this deployment." }, { status: 503 });
    }
    return NextResponse.json({ error: "R2 image storage is not configured correctly." }, { status: 503 });
  }

  const client = createR2Client(config);
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: filePath }));
    const contentType = head.ContentType as NewsroomImageType;
    if (!Object.prototype.hasOwnProperty.call(NEWSROOM_IMAGE_TYPES, contentType)) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: filePath })).catch(() => undefined);
      return NextResponse.json({ error: "The uploaded file is not a supported image type." }, { status: 400 });
    }
    if (!head.ContentLength || head.ContentLength < 1 || head.ContentLength > MAX_NEWSROOM_IMAGE_BYTES) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: filePath })).catch(() => undefined);
      return NextResponse.json({ error: "The uploaded image exceeds the 10 MB newsroom limit." }, { status: 400 });
    }

    const sample = await client.send(new GetObjectCommand({
      Bucket: config.bucketName,
      Key: filePath,
      Range: "bytes=0-11",
    }));
    if (!sample.Body) throw new Error("Could not verify the uploaded image.");
    const signature = new Uint8Array(await sample.Body.transformToByteArray());
    if (!hasValidImageSignature(contentType, signature)) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: filePath })).catch(() => undefined);
      return NextResponse.json({ error: "The uploaded file contents do not match its image type." }, { status: 400 });
    }

    const publicUrl = `${config.publicBaseUrl}/${filePath.split("/").map(encodeURIComponent).join("/")}`;
    const rows = await queryNeon(
      "insert into public.media (id,file_path,public_url,alt_text,caption,uploaded_by) values ($1,$2,$3,$4,'',$5) returning id,file_path,public_url,alt_text,created_at",
      [randomUUID(), filePath, publicUrl, altText, actor.id],
    );
    return NextResponse.json(rows[0], { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "This image has already been added to the newsroom media library." }, { status: 409 });
    }
    console.error("Could not verify or register newsroom R2 image", error);
    return NextResponse.json({ error: "The image uploaded but could not be registered in the newsroom media library." }, { status: 500 });
  }
}
