const BACKEND_URL = process.env.CERNPIX_BACKEND_URL || "http://127.0.0.1:8010";

export type DetectionResult = {
  filename: string;
  folder: string | null;
  flagged: boolean;
  score: number;
  detector: string;
  detector_display_name: string;
  reason: string;
  error?: string;
};

export async function detectImages(
  files: File[],
  folder?: string,
): Promise<DetectionResult[]> {
  if (files.length === 0) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  if (folder) formData.append("folder", folder);

  try {
    const response = await fetch(`${BACKEND_URL}/api/detect`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Detection backend returned", response.status);
      return [];
    }

    const data = await response.json();
    return data.results ?? [];
  } catch (error) {
    console.error("Failed to reach detection backend:", error);
    return [];
  }
}

export async function fetchDetectionHistory(): Promise<
  Map<string, DetectionResult>
> {
  const map = new Map<string, DetectionResult>();

  try {
    const response = await fetch(`${BACKEND_URL}/api/detections`, {
      cache: "no-store",
    });
    if (!response.ok) return map;

    const data = await response.json();
    const detections: DetectionResult[] = data.detections ?? [];

    // Keep only the most recent record per (folder, filename); the API
    // returns newest-first, so the first occurrence wins.
    for (const detection of detections) {
      const key = `${detection.folder ?? ""}/${detection.filename}`;
      if (!map.has(key)) {
        map.set(key, detection);
      }
    }
  } catch (error) {
    console.error("Failed to reach detection backend:", error);
  }

  return map;
}
