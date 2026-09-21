export class ThumbnailGenerator {
  public static async generate(blob: Blob, maxDimension = 400): Promise<Blob> {
    if (typeof createImageBitmap !== 'function') {
      return this.generateFallback(blob, maxDimension);
    }
    
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch (err) {
      console.warn('[ThumbnailGenerator] createImageBitmap failed, trying fallback', err);
      return this.generateFallback(blob, maxDimension);
    }

    try {
      const { width, height } = this.calculateDimensions(bitmap.width, bitmap.height, maxDimension);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(bitmap, 0, 0, width, height);
      
      return await new Promise<Blob>((resolve, reject) => {
        let isWebpSupported = false;
        try {
          isWebpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch(e) {
          // Ignore
        }
        const format = isWebpSupported ? 'image/webp' : 'image/jpeg';
        
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error('Canvas toBlob failed'));
          },
          format,
          0.8
        );
      }).finally(() => {
        // Cleanup canvas memory
        canvas.width = 0;
        canvas.height = 0;
      });
    } finally {
      bitmap.close();
    }
  }

  private static calculateDimensions(width: number, height: number, max: number) {
    if (width <= max && height <= max) {
      return { width, height };
    }
    const ratio = width / height;
    if (width > height) {
      return { width: max, height: Math.round(max / ratio) };
    }
    return { width: Math.round(max * ratio), height: max };
  }

  private static generateFallback(blob: Blob, maxDimension: number): Promise<Blob> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.document || !window.URL) {
        return resolve(blob); // JSDOM / Node testing fallback
      }
      
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
           const { width, height } = this.calculateDimensions(img.width || 800, img.height || 600, maxDimension);
           const canvas = document.createElement('canvas');
           canvas.width = width;
           canvas.height = height;
           const ctx = canvas.getContext('2d');
           if (ctx) ctx.drawImage(img, 0, 0, width, height);
           
           canvas.toBlob((res) => {
             canvas.width = 0;
             canvas.height = 0;
             if (res) resolve(res);
             else resolve(blob);
           }, 'image/jpeg', 0.8);
        } catch (e) {
           resolve(blob);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob); // If image loading fails, return original to avoid halting flow
      };
      
      img.src = url;
    });
  }
}
