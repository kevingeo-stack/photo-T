import { PhotoEditState } from '../types';

/**
 * ImageExporter — Renders an edited photo to a Blob using an offscreen Canvas.
 *
 * This is the only place where we generate a rasterised copy of a photo.
 * It applies CSS-equivalent transforms (brightness, contrast, saturation, crop)
 * via the Canvas 2D filter API.
 *
 * Important constraints:
 * - Does NOT modify the source Blob.
 * - RAW files that the browser cannot decode will fail at createImageBitmap / <img>.
 *   In that case the caller receives undefined and must handle the fallback.
 * - Output format is always image/jpeg (wide browser support, reasonable quality).
 */
export class ImageExporter {
  /**
   * Renders a Blob with the given editState applied and returns a new Blob.
   * Returns undefined if the source cannot be decoded by the browser.
   */
  public static async renderEdited(
    sourceBlob: Blob,
    editState: PhotoEditState,
    format: string = 'image/jpeg',
    quality: number = 0.92
  ): Promise<Blob | undefined> {
    const crop = editState.crop ?? { x: 0, y: 0, width: 1, height: 1 };
    const { brightness, contrast, saturation } = editState;

    // --- Decode source image ---
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(sourceBlob);
    } catch (e) {
      console.warn('[ImageExporter] Browser cannot decode source blob', e);
      return undefined;
    }

    const naturalW = bitmap.width;
    const naturalH = bitmap.height;

    // --- Crop region in source pixels ---
    const srcX = Math.round(crop.x * naturalW);
    const srcY = Math.round(crop.y * naturalH);
    const srcW = Math.round(crop.width * naturalW);
    const srcH = Math.round(crop.height * naturalH);

    // Output canvas matches cropped dimensions (capped at 4096 to be safe with GPU limits)
    const MAX = 4096;
    const scale = Math.min(1, MAX / Math.max(srcW, srcH));
    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return undefined;
    }

    // Apply CSS-equivalent filters via Canvas filter API
    // Note: Canvas filter is well-supported in all modern browsers (Chrome, FF, Safari ≥ 18)
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    ctx.drawImage(bitmap, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    bitmap.close();

    return new Promise<Blob | undefined>((resolve) => {
      canvas.toBlob(
        (blob) => {
          // Free canvas memory
          canvas.width = 0;
          canvas.height = 0;
          resolve(blob ?? undefined);
        },
        format,
        quality
      );
    });
  }

  /**
   * Helper to download a Blob to the user's local disk.
   */
  public static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Replaces the extension of a filename based on the desired MIME type.
   */
  public static replaceExtension(originalName: string, mimeType: string): string {
    const dotIdx = originalName.lastIndexOf('.');
    const base = dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName;
    
    let ext = '';
    if (mimeType === 'image/jpeg') ext = '.jpg';
    else if (mimeType === 'image/png') ext = '.png';
    else if (mimeType === 'image/webp') ext = '.webp';
    else if (mimeType === 'image/tiff') ext = '.tiff';
    
    return `${base}${ext}`;
  }

  /**
   * Derives a human-readable copy name from the original file name.
   * Examples:
   *   "Image1.png"    → "Image1_editada.jpg"
   *   "DSC08492.ARW"  → "DSC08492_editada.jpg"
   *   "photo.jpg"     → "photo_editada.jpg"
   * Output is always .jpg because we always render to image/jpeg.
   */
  public static deriveCopyName(originalName: string): string {
    const dotIdx = originalName.lastIndexOf('.');
    const base = dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName;
    return `${base}_editada.jpg`;
  }
}
