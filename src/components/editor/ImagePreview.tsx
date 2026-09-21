import React, { useRef, useState, useEffect } from 'react';
import { PhotoEditState } from '../../types';
import { CropOverlay, CropState } from './CropOverlay';

interface ImagePreviewProps {
  url: string;
  editState: PhotoEditState;
  onCropChange: (crop: CropState) => void;
  isCropping: boolean;
  isLoading?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  url, 
  editState, 
  onCropChange, 
  isCropping,
  isLoading
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Create a filter string for CSS
  const filterStyle = `brightness(${editState.brightness}%) contrast(${editState.contrast}%) saturate(${editState.saturation}%)`;
  
  // Calculate crop presentation when NOT in crop mode.
  // We use object-view-box or clip-path or simply an inner container with negative margins/scale to visually crop.
  // The safest cross-browser visual crop without canvas is using a relative wrapper and absolute positioning.
  
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setImageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [url]);

  const crop = editState.crop || { x: 0, y: 0, width: 1, height: 1 };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/5 p-4">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-[32px] text-primary/50">sync</span>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="relative flex items-center justify-center w-full h-full"
        >
          {isCropping ? (
            // In crop mode, show the full image with the crop overlay
            <div className="relative inline-block w-full h-full">
              <img 
                ref={imgRef}
                src={url} 
                className="w-full h-full object-contain pointer-events-none" 
                style={{ filter: filterStyle }}
                alt="Preview" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0">
                <CropOverlay crop={editState.crop} onChange={onCropChange} isActive={true} />
              </div>
            </div>
          ) : (
            // In normal mode, we visually crop using transform: scale() & translate() while maintaining object-contain
            <div className="relative w-full h-full overflow-hidden rounded-md shadow-sm">
              <img 
                src={url} 
                className="w-full h-full object-contain pointer-events-none origin-center" 
                style={{ 
                  filter: filterStyle,
                  transform: `scale(${1 / crop.width}) translate(${(0.5 - (crop.x + crop.width/2)) * 100}%, ${(0.5 - (crop.y + crop.height/2)) * 100}%)`,
                  transition: 'transform 0.2s ease-out'
                }}
                alt="Preview cropped" 
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
