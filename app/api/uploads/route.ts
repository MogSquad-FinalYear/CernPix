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

async function ensureUploadFolders() {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
  await fs.mkdir(PUBLIC_UPLOADS_ROOT, { recursive: true });
}

async function syncUploadsToPublic() {
  await fs.rm(PUBLIC_UPLOADS_ROOT, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_UPLOADS_ROOT, { recursive: true });
  await fs.cp(UPLOADS_ROOT, PUBLIC_UPLOADS_ROOT, { recursive: true, force: true });
}

function normalizeFolderName(name: string) {
  return (name || "upload-folder")
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  await ensureUploadFolders();
  await syncUploadsToPublic();

  const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
  const images: any[] = [];
  const folders: any[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(UPLOADS_ROOT, entry.name);

    if (entry.isDirectory()) {
      const childEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const childImages = childEntries
        .filter((child) => child.isFile() && isImageFile(child.name))
        .map((child) => ({
          id: `folder-${entry.name}-${child.name}`,
          name: child.name,
          path: `/uploads/${entry.name}/${child.name}`,
          flagged: /ai|fake|deepfake|manipulated|onepeice|sasuke|zoro/i.test(
            child.name,
          ),
          folder: entry.name,
        }));

      if (childImages.length > 0) {
        folders.push({
          id: `folder-${entry.name}`,
          name: entry.name,
          path: `/uploads/${entry.name}`,
          flagged: childImages.some((item) => item.flagged),
          children: childImages,
        });
      }
      continue;
    }

    if (entry.isFile() && isImageFile(entry.name)) {
      images.push({
        id: `root-${entry.name}`,
        name: entry.name,
        path: `/uploads/${entry.name}`,
        flagged: /ai|fake|deepfake|manipulated|onepeice|sasuke|zoro/i.test(
          entry.name,
        ),
      });
    }
  }

  return NextResponse.json({ images, folders });
}

export async function POST(request: Request) {
  await ensureUploadFolders();

  const formData = await request.formData();
  const files = formData.getAll("images");

  for (const file of files) {
    if (!(file instanceof File)) continue;
    if (!isImageFile(file.name)) continue;

    const targetPath = path.join(UPLOADS_ROOT, file.name);
    const arrayBuffer = await file.arrayBuffer();

    await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
  }

  await syncUploadsToPublic();

  return NextResponse.json({ ok: true });
}
