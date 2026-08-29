"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileImage,
  FolderOpen,
  ImagePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryFolder, GalleryImage } from "@/lib/uploads";

export function MediaGalleryPage({
  view = "upload",
}: {
  view?: "upload" | "all" | "flagged";
}) {
  const [selectedView, setSelectedView] = useState<
    "upload" | "all" | "flagged"
  >(view);
  const defaultView = view;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<GalleryImage[]>([]);
  const [uploadedFolders, setUploadedFolders] = useState<GalleryFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const refreshMedia = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/uploads");
      if (!response.ok) {
        throw new Error("Unable to load uploads");
      }

      const data = await response.json();
      setUploadedImages(data.images ?? []);
      setUploadedFolders(data.folders ?? []);
    } catch (error) {
      console.error(error);
      setUploadedImages([]);
      setUploadedFolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMedia();
  }, []);

  useEffect(() => {
    const folderInput = folderInputRef.current;
    if (!folderInput) return;

    const folderInputElement = folderInput as HTMLInputElement & {
      webkitdirectory?: boolean;
      directory?: boolean;
    };

    folderInputElement.webkitdirectory = true;
    folderInputElement.directory = true;
  }, []);

  const allImages = useMemo(() => {
    return [
      ...uploadedImages,
      ...uploadedFolders.flatMap((folder) => folder.children),
    ];
  }, [uploadedImages, uploadedFolders]);

  const flaggedImages = useMemo(() => {
    return allImages.filter((image) => image.flagged);
  }, [allImages]);

  const folderViews = useMemo(() => {
    return uploadedFolders.map((folder) => ({
      ...folder,
      imageCount: folder.children.length,
    }));
  }, [uploadedFolders]);

  const visibleImages = useMemo(() => {
    if (selectedView === "flagged") {
      return flaggedImages;
    }

    if (selectedFolderId) {
      const folder = uploadedFolders.find(
        (item) => item.id === selectedFolderId,
      );
      return folder ? folder.children : [];
    }

    if (selectedView === "all") {
      return allImages;
    }

    return uploadedImages;
  }, [
    selectedFolderId,
    selectedView,
    uploadedFolders,
    uploadedImages,
    flaggedImages,
    allImages,
  ]);

  const handleFiles = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;

    const imageFiles = selected.filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!imageFiles.length) return;

    const formData = new FormData();
    imageFiles.forEach((file) => formData.append("images", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      await refreshMedia();
    }
  };

  const handleFolderUpload = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;

    const imageFiles = selected.filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!imageFiles.length) return;

    const formData = new FormData();
    formData.append("folderName", `Folder-${Date.now()}`);
    imageFiles.forEach((file) => formData.append("images", file));

    const response = await fetch("/api/uploads/folder", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      await refreshMedia();
    }
  };

  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedView("all");
  };

  const clearSelection = () => {
    setSelectedFolderId(null);
    setSelectedView(defaultView);
    setSelectedImageId(null);
  };

  const uploadedFolderCount = folderViews.length;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        {selectedView === "upload" && !selectedFolderId && (
          <section className="rounded-2xl border border-dashed border-border bg-card p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Image upload
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Upload images or folders
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => inputRef.current?.click()}
                  className="gap-2"
                >
                  <ImagePlus className="size-4" />
                  Add images
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => folderInputRef.current?.click()}
                  className="gap-2"
                >
                  <FolderOpen className="size-4" />
                  Add folder
                </Button>
              </div>
            </div>

            <Input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />

            <input
              ref={folderInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFolderUpload(event.target.files)}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Images</p>
                <p className="mt-2 text-3xl font-bold">
                  {isLoading ? "..." : uploadedImages.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Folders</p>
                <p className="mt-2 text-3xl font-bold">
                  {isLoading ? "..." : uploadedFolderCount}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="mt-2 text-3xl font-bold text-blue-400">
                  {isLoading ? "..." : flaggedImages.length}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Browse
                </p>
                <h3 className="text-lg font-semibold">Assets</h3>
              </div>
              {selectedFolderId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {!isLoading && folderViews.length > 0 && (
                <div className="space-y-2">
                  {folderViews.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => selectFolder(folder.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                        selectedFolderId === folder.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                          <FolderOpen className="size-4" />
                        </div>
                        <div>
                          <div className="font-medium">{folder.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {folder.imageCount} files
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {uploadedImages.length > 0 && !selectedFolderId && (
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Unfiled images</span>
                    <span className="text-xs text-muted-foreground">
                      {uploadedImages.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {uploadedImages.slice(0, 6).map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => {
                          setSelectedImageId(image.id);
                          setSelectedView("all");
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50"
                      >
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                          <FileImage className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{image.name}</div>
                          {image.flagged && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-400">
                              <AlertTriangle className="size-3" />
                              Flagged
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Preview
                </p>
                <h3 className="text-xl font-semibold">
                  {selectedFolderId
                    ? (uploadedFolders.find(
                        (folder) => folder.id === selectedFolderId,
                      )?.name ?? "Folder")
                    : selectedView === "flagged"
                      ? "Flagged media"
                      : selectedView === "all"
                        ? "All files"
                        : "Uploaded images"}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {visibleImages.length} items
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
                  Loading uploads...
                </div>
              ) : visibleImages.length === 0 ? (
                <div className="col-span-full flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
                  No images available in this view.
                </div>
              ) : null}

              {visibleImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  className={`group overflow-hidden rounded-xl border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 ${
                    selectedImageId === image.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-muted">
                    <Image
                      src={image.path}
                      alt={image.name}
                      loading="eager"
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    {image.flagged && (
                      <>
                        <div className="absolute inset-0 bg-slate-950/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        <div className="absolute inset-x-3 bottom-3 rounded-lg border border-blue-400/80 bg-slate-950/75 p-3 text-left text-[11px] text-blue-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                          <div className="flex items-center gap-2 font-medium text-blue-300">
                            <AlertTriangle className="size-3.5" />
                            Flagged
                          </div>
                          <div className="mt-2 space-y-1">
                            <div>
                              <span className="text-blue-200">
                                Detector name:
                              </span>{" "}
                              "Universal Detector"
                            </div>
                            <div>
                              <span className="text-blue-200">Reason:</span>{" "}
                              lorem ipsum
                            </div>
                          </div>
                        </div>
                        <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-blue-500/90 px-2 py-1 text-[10px] font-medium text-white">
                          <AlertTriangle className="size-3" />
                          Flagged
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {image.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {image.folder ?? "Root"}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {image.flagged ? "AI" : "Safe"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
