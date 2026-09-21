import { useState, useEffect } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { BlobUrlManager } from '../utils/BlobUrlManager';

interface UsePhotoOriginalResult {
  url: string;
  isLoading: boolean;
  error: Error | null;
}

export function usePhotoOriginal(photoId: string | undefined): UsePhotoOriginalResult {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentUrl = '';

    if (!photoId) {
      setIsLoading(false);
      setUrl('');
      setError(null);
      return;
    }

    const loadOriginal = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const pm = PhotoManager.getInstance();
        const photo = pm.getPhotos().find(p => p.id === photoId);
        
        let blob: Blob | undefined = undefined;
        let isRaw = false;

        if (photo?.format) {
          const webFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'SVG'];
          isRaw = !webFormats.includes(photo.format.toUpperCase());
        } else if (photo?.name) {
          const ext = photo.name.split('.').pop()?.toUpperCase() || '';
          const webFormats = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'SVG'];
          isRaw = !webFormats.includes(ext);
        }

        if (isRaw) {
          // RAW: Intentar thumbnail primero. Si falla, intentar original como última esperanza.
          try {
            blob = await pm.getPhotoThumbnail(photoId);
          } catch (e) {
            console.warn(`[usePhotoOriginal] Failed to load thumbnail for RAW ${photoId}`, e);
          }

          if (!blob) {
            try {
              blob = await pm.getPhotoBlob(photoId);
            } catch (e) {
              console.warn(`[usePhotoOriginal] Failed to load original fallback for RAW ${photoId}`, e);
            }
          }
        } else {
          // WEB (JPG, PNG, etc): Intentar original primero. Si falla, intentar thumbnail como fallback.
          try {
            blob = await pm.getPhotoBlob(photoId);
          } catch (e) {
            console.warn(`[usePhotoOriginal] Failed to load original for ${photoId}`, e);
          }

          if (!blob) {
            try {
              blob = await pm.getPhotoThumbnail(photoId);
            } catch (e) {
              console.warn(`[usePhotoOriginal] Failed to load thumbnail fallback for ${photoId}`, e);
            }
          }
        }
        
        if (!isMounted) return;

        if (blob) {
          currentUrl = BlobUrlManager.createUrl(blob);
          setUrl(currentUrl);
        } else {
          setError(new Error('Imagen no disponible'));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error loading original image'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOriginal();

    return () => {
      isMounted = false;
      if (currentUrl) {
        BlobUrlManager.revokeUrl(currentUrl);
      }
    };
  }, [photoId]);

  return { url, isLoading, error };
}
