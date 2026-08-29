export type GalleryImage = {
  id: string;
  name: string;
  type: "image";
  path: string;
  flagged: boolean;
  folder?: string;
};

export type GalleryFolder = {
  id: string;
  name: string;
  type: "folder";
  path: string;
  flagged: boolean;
  children: GalleryImage[];
};

export type GalleryItem = GalleryImage | GalleryFolder;

export const galleryItems: GalleryItem[] = [
  {
    id: "upload-1",
    name: "onepeice wallpaper.jpg",
    type: "image",
    path: "/uploads/onepeice wallpaper.jpg",
    flagged: true,
  },
  {
    id: "upload-2",
    name: "1355975-Roronoa-ZoroOne-Piece-4k-Ultra-HD-Wallpaper.jpg",
    type: "image",
    path: "/uploads/1355975-Roronoa-ZoroOne-Piece-4k-Ultra-HD-Wallpaper.jpg",
    flagged: false,
  },
  {
    id: "upload-3",
    name: "sasuke-naruto-uhdpaper.com-4K-48.jpg",
    type: "image",
    path: "/uploads/sasuke-naruto-uhdpaper.com-4K-48.jpg",
    flagged: true,
  },
  {
    id: "folder-devtrails",
    name: "Devtrails",
    type: "folder",
    path: "/uploads/Devtrails",
    flagged: true,
    children: [
      {
        id: "devtrails-1",
        name: "cert&sheild.png",
        type: "image",
        path: "/uploads/Devtrails/cert&sheild.png",
        flagged: true,
        folder: "Devtrails",
      },
      {
        id: "devtrails-2",
        name: "devtrails_collage.jpg",
        type: "image",
        path: "/uploads/Devtrails/devtrails_collage.jpg",
        flagged: false,
        folder: "Devtrails",
      },
      {
        id: "devtrails-3",
        name: "devtrails_prize.jpg",
        type: "image",
        path: "/uploads/Devtrails/devtrails_prize.jpg",
        flagged: true,
        folder: "Devtrails",
      },
    ],
  },
];

export const flaggedItems: GalleryItem[] = galleryItems
  .map((item) => {
    if (item.type === "folder") {
      const flaggedChildren = item.children.filter((child) => child.flagged);
      if (flaggedChildren.length === 0) {
        return null;
      }

      return {
        ...item,
        flagged: true,
        children: flaggedChildren,
      };
    }

    return item.flagged ? item : null;
  })
  .filter(Boolean) as GalleryItem[];
