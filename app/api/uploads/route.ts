import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { detectImages, fetchDetectionHistory } from "@/lib/detection-client";
import type { GalleryFolder, GalleryImage } from "@/lib/uploads";

function resolveUploadRoot() {
  const configuredRoot = process.env.CERNPIX_UPLOADS_DIR || process.env.UPLOADS_DIR;
  if (configuredRoot && configuredRoot.trim()) {
    return path.resolve(configuredRoot.trim());
  }
  return path.join(process.cwd(), "uploads");
}

function resolvePublicUploadRoot() {
  const configuredRoot =
    process.env.CERNPIX_PUBLIC_UPLOADS_DIR || process.env.PUBLIC_UPLOADS_DIR;
  if (configuredRoot && configuredRoot.trim()) {
    return path.resolve(configuredRoot.trim());
  }
  return path.join(process.cwd(), "public", "uploads");
}

const UPLOADS_ROOT = resolveUploadRoot();
const PUBLIC_UPLOADS_ROOT = resolvePublicUploadRoot();

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
  // Copy-with-overwrite only -- deliberately not wiping PUBLIC_UPLOADS_ROOT
  // first. This runs on every GET, and a concurrent request (dev-mode double
  // effects, multiple tabs, a request landing mid-sync) could otherwise
  // observe an empty directory between the wipe and the recopy, 404-ing any
  // <img> that was mid-load.
  await fs.mkdir(PUBLIC_UPLOADS_ROOT, { recursive: true });
  await fs.cp(UPLOADS_ROOT, PUBLIC_UPLOADS_ROOT, { recursive: true, force: true });
}

export async function GET() {
  await ensureUploadFolders();
  await syncUploadsToPublic();

  const history = await fetchDetectionHistory();

  const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
  const images: GalleryImage[] = [];
  const folders: GalleryFolder[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(UPLOADS_ROOT, entry.name);

    if (entry.isDirectory()) {
      const childEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const childImages: GalleryImage[] = childEntries
        .filter((child) => child.isFile() && isImageFile(child.name))
        .map((child) => {
          const detection = history.get(`${entry.name}/${child.name}`);
          return {
            id: `folder-${entry.name}-${child.name}`,
            name: child.name,
            path: `/uploads/${entry.name}/${child.name}`,
            flagged: detection?.flagged ?? false,
            folder: entry.name,
            detector: detection?.detector_display_name,
            reason: detection?.reason,
            score: detection?.score,
          };
        });

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
      const detection = history.get(`/${entry.name}`);
      images.push({
        id: `root-${entry.name}`,
        name: entry.name,
        path: `/uploads/${entry.name}`,
        flagged: detection?.flagged ?? false,
        detector: detection?.detector_display_name,
        reason: detection?.reason,
        score: detection?.score,
      });
    }
  }

  return NextResponse.json({ images, folders });
}

async function uniqueLocalName(dir: string, fileName: string) {
  const safeName = path.basename(fileName).replace(/[\\/]/g, "_");
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
  const files = formData.getAll("images").filter(
    (file): file is File => file instanceof File && isImageFile(file.name),
  );

  // Run detection first so the filename Flask actually saved under (it does
  // its own collision de-duplication against its own uploads/ folder) is the
  // one we mirror here -- otherwise the two folders can pick different names
  // for the same collision and the gallery's history lookup misses it.
  const results = await detectImages(files);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const detected = results[i];
    const finalName =
      detected && !detected.error && detected.filename
        ? detected.filename
        : await uniqueLocalName(UPLOADS_ROOT, file.name);

    const targetPath = path.join(UPLOADS_ROOT, finalName);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
  }

  await syncUploadsToPublic();

  return NextResponse.json({ ok: true, results });
}
