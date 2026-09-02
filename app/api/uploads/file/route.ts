import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { resolveUploadPath } from "@/lib/upload-storage";

const contentTypes: Record<string, string> = {
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(request: Request) {
  const relativePath = new URL(request.url).searchParams.get("path");
  if (!relativePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const filePath = resolveUploadPath(relativePath);
  if (!filePath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = contentTypes[path.extname(filePath).toLowerCase()];
    return new NextResponse(file, {
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
