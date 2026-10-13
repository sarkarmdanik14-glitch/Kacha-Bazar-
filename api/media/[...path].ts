import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "kachabazar-image";
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

const r2Client = (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT)
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

export default async function handler(req: any, res: any) {
  const pathParam = req.query?.path;
  const rawKey = Array.isArray(pathParam) ? pathParam.join("/") : (pathParam || "");
  const key = decodeURIComponent(rawKey).replace(/^\/+/, "").split("?")[0];

  if (!key) {
    return res.status(400).send("Image key is required");
  }

  if (!r2Client) {
    return res.status(503).send("Cloudflare R2 storage credentials not configured in environment");
  }

  try {
    const r2Obj = await r2Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));

    if (r2Obj.ContentType) {
      res.setHeader("Content-Type", r2Obj.ContentType);
    } else {
      const ext = key.split(".").pop()?.toLowerCase();
      if (ext === "jpg" || ext === "jpeg") res.setHeader("Content-Type", "image/jpeg");
      else if (ext === "png") res.setHeader("Content-Type", "image/png");
      else if (ext === "webp") res.setHeader("Content-Type", "image/webp");
      else if (ext === "svg") res.setHeader("Content-Type", "image/svg+xml");
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const bytes = await r2Obj.Body?.transformToByteArray();
    if (bytes) {
      return res.status(200).send(Buffer.from(bytes));
    }
    return res.status(404).send("Image not found");
  } catch (err: any) {
    return res.status(404).send("Image not found in R2");
  }
}
