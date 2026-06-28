import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET;

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function assertConfigured() {
  if (!region || !bucket || !process.env.AWS_ACCESS_KEY_ID) {
    throw new Error("S3 is not configured. Set AWS_* and S3_BUCKET in .env.");
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Presigned PUT URL the browser uploads the receipt straight to. */
export async function presignUpload(
  userId: number,
  filename: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  assertConfigured();
  const key = `receipts/${userId}/${Date.now()}-${safeName(filename)}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );
  return { url, key };
}

/** Presigned GET URL to view/download a stored receipt. */
export async function presignView(key: string): Promise<string> {
  assertConfigured();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 }
  );
}
