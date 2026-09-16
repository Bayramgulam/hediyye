import { requireRole } from "@/lib/auth";
import { apiError } from "@/lib/security";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAuthUrl } from "@/lib/site-url";
export async function POST(r: Request) {
  try {
    await requireRole(true);
    if (
      r.headers.get("origin") !== getAuthUrl()
    )
      throw Error("FORBIDDEN");
    if (Number(r.headers.get("content-length")) > 6 * 1024 * 1024)
      throw Error("Şəkil 5 MB-dan böyük olmamalıdır.");
    const form = await r.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
      throw Error("Şəkil 5 MB-dan böyük olmamalıdır.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, {
      limitInputPixels: 20000000,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 6000 ||
      metadata.height > 6000
    )
      throw Error("Yalnız JPEG, PNG və WebP, maksimum 6000 piksel.");
    const output = await sharp(buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const key = randomUUID() + ".webp";
    let url;
    if (process.env.S3_BUCKET) {
      const client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "auto",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: output,
          ContentType: "image/webp",
        }),
      );
      url = process.env.MEDIA_PUBLIC_URL + "/" + key;
    } else {
      if (process.env.NODE_ENV === "production")
        throw Error("Media yaddaşı konfiqurasiya edilməyib.");
      await mkdir(join(process.cwd(), "public/uploads"), { recursive: true });
      await writeFile(join(process.cwd(), "public/uploads", key), output);
      url = "/uploads/" + key;
    }
    return Response.json({ url });
  } catch (e) {
    return apiError(e);
  }
}
