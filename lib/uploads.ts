export type GalleryImage = {
  id: string;
  name: string;
  path: string;
  flagged: boolean;
  folder?: string;
  detector?: string;
  reason?: string;
  score?: number;
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
