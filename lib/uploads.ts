import { promises as fs } from "fs";
import path from "path";

export type GalleryImage = {
  id: string;
  name: string;
  path: string;
  flagged: boolean;
  folder?: string;
};

export type GalleryFolder = {
  id: string;
  name: string;
  path: string;
  flagged: boolean;
  children: GalleryImage[];
};

export type UploadMediaState = {
  images: GalleryImage[];
  folders: GalleryFolder[];
  flagged: GalleryImage[];
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
]);

function isImageFile(fileName: string) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isFlagged(name: string) {
  const value = name.toLowerCase();
  return (
    value.includes("ai") ||
    value.includes("fake") ||
    value.includes("deepfake") ||
    value.includes("manipulated") ||
    value.includes("onepeice") ||
    value.includes("sasuke") ||
    value.includes("zoro")
  );
}

function buildImage(
  fileName: string,
  relativePath: string,
  folder?: string,
): GalleryImage {
  return {
    id: `${folder ?? "root"}-${fileName}-${relativePath}`,
    name: fileName,
    path: `/uploads/${relativePath.replace(/\\/g, "/")}`,
    flagged: isFlagged(fileName),
    folder,
  };
}

async function readFolderImages(
  folderPath: string,
  folderName: string,
): Promise<GalleryImage[]> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) =>
      buildImage(entry.name, `${folderName}/${entry.name}`, folderName),
    );

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUploadsMedia(): Promise<UploadMediaState> {
  const uploadsRoot = path.join(process.cwd(), "uploads");

  try {
    await fs.access(uploadsRoot);
  } catch {
    await fs.mkdir(uploadsRoot, { recursive: true });
    return { images: [], folders: [], flagged: [] };
  }

  const entries = await fs.readdir(uploadsRoot, { withFileTypes: true });
  const rootImages: GalleryImage[] = [];
  const folders: GalleryFolder[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(uploadsRoot, entry.name);

    if (entry.isDirectory()) {
      const folderChildren = await readFolderImages(fullPath, entry.name);
      if (folderChildren.length > 0) {
        folders.push({
          id: `folder-${entry.name}`,
          name: entry.name,
          path: `/uploads/${entry.name}`,
          flagged: folderChildren.some((child) => child.flagged),
          children: folderChildren,
        });
      }
      continue;
    }

    if (entry.isFile() && isImageFile(entry.name)) {
      rootImages.push(buildImage(entry.name, entry.name));
    }
  }

  const allImages = [
    ...rootImages,
    ...folders.flatMap((folder) => folder.children),
  ];
  const flagged = allImages.filter((image) => image.flagged);

  return {
    images: rootImages.sort((a, b) => a.name.localeCompare(b.name)),
    folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
    flagged: flagged.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
