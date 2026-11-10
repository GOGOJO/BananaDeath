import type { ModelMetadata } from "../types/prediction";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Return a user-facing reason the file can't be used, or null if it's fine. */
export function validateFile(file: File): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "That image is larger than 10 MB. Try a smaller photo.";
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}

/**
 * Where to draw a `width` x `height` image inside a `size` x `size` square so
 * the whole image fits and is centered. This matches the Python `PadToSquare`
 * followed by a resize, so the browser sees the same framing as training did.
 */
export function letterbox(width: number, height: number, size: number) {
  const scale = size / Math.max(width, height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  return { x: (size - drawWidth) / 2, y: (size - drawHeight) / 2, width: drawWidth, height: drawHeight };
}

/** Convert RGBA pixels to the normalized, channel-first float tensor the model expects. */
export function rgbaToTensor(
  rgba: Uint8ClampedArray,
  size: number,
  mean: readonly number[],
  std: readonly number[],
): Float32Array {
  const plane = size * size;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      tensor[c * plane + i] = (rgba[i * 4 + c] / 255 - mean[c]) / std[c];
    }
  }
  return tensor;
}

/** Decode, letterbox, and normalize an image file in the browser. */
export async function fileToTensor(file: File, meta: ModelMetadata): Promise<Float32Array> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const size = meta.image_size;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot process images.");

  const [r, g, b] = meta.pad_fill_rgb;
  context.fillStyle = `rgb(${r}, ${g}, ${b})`;
  context.fillRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const box = letterbox(bitmap.width, bitmap.height, size);
  context.drawImage(bitmap, box.x, box.y, box.width, box.height);
  bitmap.close();

  const { data } = context.getImageData(0, 0, size, size);
  return rgbaToTensor(data, size, meta.normalize_mean, meta.normalize_std);
}
