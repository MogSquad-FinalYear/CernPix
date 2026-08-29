import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const PUBLIC_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

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

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("images");
  const folderName = slugify(
    String(formData.get("folderName") || `folder-${Date.now()}`),
  );

  const targetFolder = path.join(UPLOADS_ROOT, folderName);
  const publicFolder = path.join(PUBLIC_UPLOADS_ROOT, folderName);

  await fs.mkdir(targetFolder, { recursive: true });
  await fs.mkdir(publicFolder, { recursive: true });

  for (const rawFile of files) {
    if (!(rawFile instanceof File)) continue;
    if (!isImageFile(rawFile.name)) continue;

    const buffer = Buffer.from(await rawFile.arrayBuffer());
    const safeName = rawFile.name.replace(/[\\/]/g, "_");

    await fs.writeFile(path.join(targetFolder, safeName), buffer);
    await fs.writeFile(path.join(publicFolder, safeName), buffer);
  }

  return NextResponse.json({ ok: true, folder: folderName });
}
