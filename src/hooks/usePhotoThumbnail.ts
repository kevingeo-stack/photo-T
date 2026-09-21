import { useState, useEffect } from 'react';
import { PhotoManager } from '../services/PhotoManager';
import { BlobUrlManager } from '../utils/BlobUrlManager';

interface UsePhotoThumbnailResult {
  url: string;
  isLoading: boolean;
  error: Error | null;
}

export function usePhotoThumbnail(photoId: string): UsePhotoThumbnailResult {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentUrl = '';

    const loadThumbnail = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const pm = PhotoManager.getInstance();
        const blob = await pm.getPhotoThumbnail(photoId);
        
        if (!isMounted) return;

        if (blob) {
          currentUrl = BlobUrlManager.createUrl(blob);
          setUrl(currentUrl);
        } else {
          setError(new Error('Thumbnail not found'));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error loading thumbnail'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      isMounted = false;
      if (currentUrl) {
        BlobUrlManager.revokeUrl(currentUrl);
      }
    };
  }, [photoId]);

  return { url, isLoading, error };
}
