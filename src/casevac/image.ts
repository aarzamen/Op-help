/**
 * Read a user-picked image (map screenshot, photo of the terrain model) and downscale it so
 * it fits in localStorage: longest side ≤ 1600 px, JPEG ~0.82. EXIF orientation is applied
 * by the browser when decoding.
 */
export async function readImageFile(
  file: File,
  maxSide = 1600
): Promise<{ dataUrl: string; aspect: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Unreadable image'));
      img.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.82), aspect: h / w };
  } finally {
    URL.revokeObjectURL(url);
  }
}
