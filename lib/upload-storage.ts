import { promises as fs } from "fs";
import path from "path";

const isVercel = process.env.VERCEL === "1";
const bundledUploadsRoot = path.join(process.cwd(), "uploads");
const configuredUploadsRoot =
  process.env.CERNPIX_UPLOADS_DIR || process.env.UPLOADS_DIR;

export const uploadsRoot = configuredUploadsRoot?.trim()
  ? path.resolve(configuredUploadsRoot.trim())
  : isVercel
    ? "/tmp/cernpix/uploads"
    : bundledUploadsRoot;

const configuredPublicRoot =
  process.env.CERNPIX_PUBLIC_UPLOADS_DIR || process.env.PUBLIC_UPLOADS_DIR;
export const publicUploadsRoot = configuredPublicRoot?.trim()
  ? path.resolve(configuredPublicRoot.trim())
  : path.join(process.cwd(), "public", "uploads");

export const usesEphemeralStorage = isVercel && !configuredUploadsRoot?.trim();

export async function ensureUploadFolders() {
  await fs.mkdir(uploadsRoot, { recursive: true });
  if (usesEphemeralStorage) {
    await fs
      .cp(bundledUploadsRoot, uploadsRoot, {
        recursive: true,
        force: false,
        errorOnExist: false,
      })
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
  }
}

export async function syncUploadsToPublic() {
  if (isVercel) return;
  await fs.mkdir(publicUploadsRoot, { recursive: true });
  await fs.cp(uploadsRoot, publicUploadsRoot, { recursive: true, force: true });
}

export function imageUrl(relativePath: string) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  return isVercel
    ? `/api/uploads/file?path=${encodeURIComponent(normalizedPath)}`
    : `/uploads/${normalizedPath}`;
}

export function resolveUploadPath(relativePath: string) {
  const root = path.resolve(uploadsRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }
  return resolved;
}
