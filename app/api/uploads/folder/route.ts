import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { detectImages } from "@/lib/detection-client";
import {
  ensureUploadFolders,
  publicUploadsRoot,
  syncUploadsToPublic,
  uploadsRoot,
} from "@/lib/upload-storage";

const UPLOADS_ROOT = uploadsRoot;

function isImageFile(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(
    ext,
  );
}

function slugify(value: string) {
  return (value || "folder")
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

async function uniqueLocalName(dir: string, fileName: string) {
  const safeName = fileName.replace(/[\\/]/g, "_");
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);

  let candidate = safeName;
  let n = 1;
  while (
    await fs
      .access(path.join(dir, candidate))
      .then(() => true)
      .catch(() => false)
  ) {
    candidate = `${base}_${n}${ext}`;
    n += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  await ensureUploadFolders();
  const formData = await request.formData();
  const files = formData
    .getAll("images")
    .filter(
      (file): file is File => file instanceof File && isImageFile(file.name),
    );
  const folderName = slugify(
    String(formData.get("folderName") || `folder-${Date.now()}`),
  );

  const targetFolder = path.join(UPLOADS_ROOT, folderName);
  const publicFolder = path.join(publicUploadsRoot, folderName);

  await fs.mkdir(targetFolder, { recursive: true });
  if (process.env.VERCEL !== "1") {
    await fs.mkdir(publicFolder, { recursive: true });
  }

  // Same reasoning as the root upload route: let Flask's own de-duplicated
  // filename win so the gallery's history lookup matches what's in Mongo.
  const results = await detectImages(files, folderName);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const detected = results[i];
    const finalName =
      detected && !detected.error && detected.filename
        ? detected.filename
        : await uniqueLocalName(targetFolder, file.name);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(targetFolder, finalName), buffer);
    if (process.env.VERCEL !== "1") {
      await fs.writeFile(path.join(publicFolder, finalName), buffer);
    }
  }

  await syncUploadsToPublic();

  return NextResponse.json({ ok: true, folder: folderName, results });
}
