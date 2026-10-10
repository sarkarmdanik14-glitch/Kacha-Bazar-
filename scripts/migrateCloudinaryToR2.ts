import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "f28557b34a31123a24324c3124b05180";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "5fee722d943a23b2184e7a44e72553a2";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "5ce5e1826dd3f97f0a0c2e489c42c43713dc7ca5147b78af89e5aba7b0a6b073";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "kachabazar-image";
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "https://pub-8c990c8869hf42c8b8248b786e5a546d.r2.dev").replace(/\/+$/, "");
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadBufferToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function migrateCloudinaryUrlToR2(cloudinaryUrl: string, folder = "migrated"): Promise<string | null> {
  try {
    console.log(`Downloading: ${cloudinaryUrl}`);
    const res = await fetch(cloudinaryUrl);
    if (!res.ok) {
      console.warn(`Failed to download ${cloudinaryUrl}: status ${res.status}`);
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Derive a clean filename
    const urlParts = cloudinaryUrl.split("/");
    const origFilename = urlParts[urlParts.length - 1].split("?")[0] || `img_${Date.now()}.jpg`;
    const cleanName = origFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const r2Key = `${folder}/${cleanName}`;

    console.log(`Uploading to R2: ${r2Key} (${buffer.length} bytes)...`);
    const r2Url = await uploadBufferToR2(buffer, r2Key, contentType);
    console.log(`Migrated SUCCESS: ${cloudinaryUrl} -> ${r2Url}`);
    return r2Url;
  } catch (err: any) {
    console.error(`Error migrating ${cloudinaryUrl}:`, err?.message || err);
    return null;
  }
}

async function main() {
  console.log("=== STARTING CLOUDINARY TO R2 MIGRATION ===");
  const targetFiles = [
    "src/constants/branding.ts",
    "src/lib/categoryUtils.ts",
    "src/lib/subcategoryService.ts",
    "src/data.ts"
  ];

  const urlMap = new Map<string, string>();

  for (const relPath of targetFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, "utf-8");
    const matches = Array.from(content.matchAll(/https:\/\/res\.cloudinary\.com[^\s"'`)]+/g)).map(m => m[0]);

    if (matches.length === 0) continue;
    console.log(`Found ${matches.length} Cloudinary URLs in ${relPath}`);

    for (const url of matches) {
      if (!urlMap.has(url)) {
        const newUrl = await migrateCloudinaryUrlToR2(url, "branding");
        if (newUrl) {
          urlMap.set(url, newUrl);
        }
      }
    }

    // Replace in file
    let updated = content;
    for (const [cld, r2] of urlMap.entries()) {
      if (updated.includes(cld)) {
        updated = updated.split(cld).join(r2);
      }
    }

    if (updated !== content) {
      fs.writeFileSync(fullPath, updated, "utf-8");
      console.log(`Updated ${relPath} with R2 URLs!`);
    }
  }

  console.log("=== MIGRATION COMPLETE ===");
  console.log("Migrated URLs summary:");
  for (const [cld, r2] of urlMap.entries()) {
    console.log(`${cld} -> ${r2}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("migrateCloudinaryToR2.ts")) {
  main().catch(console.error);
}
